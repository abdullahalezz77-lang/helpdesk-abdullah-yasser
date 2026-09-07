import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Save active session record
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: userAgent || 'Unknown',
        ipAddress: ipAddress || '127.0.0.1',
        expiresAt,
      },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
  async register(registerDto: RegisterDto) {
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Password and confirmation do not match');
    }

    if (registerDto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: registerDto.name.trim(),
          email,
          passwordHash,
          role: 'EMPLOYEE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return {
        message: 'Account created successfully. You can now log in.',
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async logout(token?: string, userId?: string) {
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await this.prisma.session.deleteMany({
        where: { tokenHash },
      });
    } else if (userId) {
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Atomic transaction: update password and invalidate all sessions except current or all
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
      await tx.session.deleteMany({
        where: { userId },
      });
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // To prevent account enumeration, return success message even if user doesn't exist
    const genericResponse = {
      message: 'If that work email is registered, you will receive password reset instructions.',
    };

    if (!user || !user.isActive) {
      this.logger.warn(`Password recovery requested for non-existent/inactive email: ${email}`);
      return genericResponse;
    }

    // Generate random 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expireMinutes = parseInt(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_EXPIRES_MINUTES', '15'),
      10,
    );
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    // Invalidate any previous unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Save hashed token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Build reset link
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send reset email
    await this.mailService.sendPasswordResetEmail(user.email, resetLink, rawToken);

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (resetRecord.usedAt !== null) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('This reset token has expired');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Multi-step atomic transaction: update password, mark token used, invalidate all sessions
    await this.prisma.$transaction(async (tx) => {
      // 1. Update user password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 2. Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // 3. Invalidate all active sessions for this user
      await tx.session.deleteMany({
        where: { userId: resetRecord.userId },
      });
    });

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  async validateUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }
}
