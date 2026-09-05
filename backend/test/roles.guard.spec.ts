import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when route requires no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({ role: Role.EMPLOYEE });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SUPPORT, Role.MANAGER]);
    const ctx = createMockContext({ role: Role.SUPPORT });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access and throws ForbiddenException when user role does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    const ctx = createMockContext({ role: Role.EMPLOYEE });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies access if request has no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.EMPLOYEE]);
    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
