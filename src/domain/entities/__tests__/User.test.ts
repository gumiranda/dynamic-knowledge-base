import { User } from '../User';
import { UserRole } from '../../enums/UserRole';
import { EntityUtils } from '../../utils/EntityUtils';

describe('User', () => {
  let validUserData: {
    name: string;
    email: string;
    role: UserRole;
  };

  beforeEach(() => {
    validUserData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: UserRole.EDITOR,
    };
  });

  describe('constructor', () => {
    it('should create user with provided data', () => {
      const user = new User(validUserData);

      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email);
      expect(user.role).toBe(validUserData.role);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with custom id and timestamps', () => {
      const customId = EntityUtils.generateId();
      const customDate = new Date('2023-01-01');

      const user = new User({
        ...validUserData,
        id: customId,
        createdAt: customDate,
        updatedAt: customDate,
      });

      expect(user.id).toBe(customId);
      expect(user.createdAt).toBe(customDate);
      expect(user.updatedAt).toBe(customDate);
    });
  });

  describe('validation methods', () => {
    let user: User;

    beforeEach(() => {
      user = new User(validUserData);
    });

    describe('isValid', () => {
      it('should return true for valid user', () => {
        expect(user.isValid()).toBe(true);
      });

      it('should return false for user with invalid name', () => {
        user.name = 'A'; // too short
        expect(user.isValid()).toBe(false);
      });

      it('should return false for user with invalid email', () => {
        user.email = 'invalid-email';
        expect(user.isValid()).toBe(false);
      });

      it('should return false for user with invalid role', () => {
        (user as any).role = 'InvalidRole';
        expect(user.isValid()).toBe(false);
      });
    });

    describe('isValidName', () => {
      it('should return true for valid names', () => {
        const validNames = [
          'John Doe',
          'Mary Jane',
          'Jean-Pierre',
          "O'Connor",
          'Dr. Smith',
          'Anne-Marie',
        ];

        validNames.forEach((name) => {
          user.name = name;
          expect(user.isValidName()).toBe(true);
        });
      });

      it('should return false for invalid names', () => {
        const invalidNames = [
          'A', // too short
          '', // empty
          'John123', // contains numbers
          'John@Doe', // contains special chars
          'A'.repeat(101), // too long
          '   ', // only spaces
        ];

        invalidNames.forEach((name) => {
          user.name = name;
          expect(user.isValidName()).toBe(false);
        });
      });
    });

    describe('isValidEmail', () => {
      it('should return true for valid emails', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'user123@test-domain.com',
        ];

        validEmails.forEach((email) => {
          user.email = email;
          expect(user.isValidEmail()).toBe(true);
        });
      });

      it('should return false for invalid emails', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
          '',
          'user name@example.com', // space
          'a'.repeat(250) + '@example.com', // too long
        ];

        invalidEmails.forEach((email) => {
          user.email = email;
          expect(user.isValidEmail()).toBe(false);
        });
      });
    });

    describe('isValidRole', () => {
      it('should return true for valid roles', () => {
        const validRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER];

        validRoles.forEach((role) => {
          user.role = role;
          expect(user.isValidRole()).toBe(true);
        });
      });
    });
  });

  describe('update methods', () => {
    let user: User;

    beforeEach(() => {
      user = new User(validUserData);
    });

    describe('updateName', () => {
      it('should update name successfully', async () => {
        const newName = 'Jane Smith';
        const originalUpdatedAt = user.updatedAt;

        // Add small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));
        user.updateName(newName);

        expect(user.name).toBe(newName);
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid names', () => {
        expect(() => user.updateName('')).toThrow('Invalid name provided');
        expect(() => user.updateName('A')).toThrow(
          'Name must be between 2 and 100 characters'
        );
        expect(() => user.updateName('John123')).toThrow(
          'Name contains invalid characters'
        );
      });
    });

    describe('updateEmail', () => {
      it('should update email successfully', async () => {
        const newEmail = 'jane.smith@example.com';
        const originalUpdatedAt = user.updatedAt;

        // Add small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));
        user.updateEmail(newEmail);

        expect(user.email).toBe(newEmail.toLowerCase());
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid emails', () => {
        expect(() => user.updateEmail('')).toThrow('Invalid email provided');
        expect(() => user.updateEmail('invalid-email')).toThrow(
          'Invalid email format'
        );
        expect(() =>
          user.updateEmail('a'.repeat(250) + '@example.com')
        ).toThrow('Email address too long');
      });
    });

    describe('updateRole', () => {
      it('should update role successfully', async () => {
        const newRole = UserRole.ADMIN;
        const originalUpdatedAt = user.updatedAt;

        // Add small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));
        user.updateRole(newRole);

        expect(user.role).toBe(newRole);
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid role', () => {
        expect(() => user.updateRole('InvalidRole' as any)).toThrow(
          'Invalid role provided'
        );
      });
    });
  });

  describe('permission methods', () => {
    it('should correctly identify admin users', () => {
      const admin = new User({ ...validUserData, role: UserRole.ADMIN });
      const editor = new User({ ...validUserData, role: UserRole.EDITOR });
      const viewer = new User({ ...validUserData, role: UserRole.VIEWER });

      expect(admin.isAdmin()).toBe(true);
      expect(editor.isAdmin()).toBe(false);
      expect(viewer.isAdmin()).toBe(false);
    });

    it('should correctly identify users who can edit', () => {
      const admin = new User({ ...validUserData, role: UserRole.ADMIN });
      const editor = new User({ ...validUserData, role: UserRole.EDITOR });
      const viewer = new User({ ...validUserData, role: UserRole.VIEWER });

      expect(admin.canEdit()).toBe(true);
      expect(editor.canEdit()).toBe(true);
      expect(viewer.canEdit()).toBe(false);
    });

    it('should correctly identify viewer-only users', () => {
      const admin = new User({ ...validUserData, role: UserRole.ADMIN });
      const editor = new User({ ...validUserData, role: UserRole.EDITOR });
      const viewer = new User({ ...validUserData, role: UserRole.VIEWER });

      expect(admin.isViewerOnly()).toBe(false);
      expect(editor.isViewerOnly()).toBe(false);
      expect(viewer.isViewerOnly()).toBe(true);
    });

    it('should correctly compare user permissions', () => {
      const admin = new User({ ...validUserData, role: UserRole.ADMIN });
      const editor = new User({ ...validUserData, role: UserRole.EDITOR });
      const viewer = new User({ ...validUserData, role: UserRole.VIEWER });

      expect(admin.hasEqualOrHigherPermissionsThan(editor)).toBe(true);
      expect(admin.hasEqualOrHigherPermissionsThan(viewer)).toBe(true);
      expect(editor.hasEqualOrHigherPermissionsThan(viewer)).toBe(true);
      expect(editor.hasEqualOrHigherPermissionsThan(admin)).toBe(false);
      expect(viewer.hasEqualOrHigherPermissionsThan(editor)).toBe(false);
      expect(viewer.hasEqualOrHigherPermissionsThan(admin)).toBe(false);
    });
  });

  describe('utility methods', () => {
    let user: User;

    beforeEach(() => {
      user = new User(validUserData);
    });

    it('should return correct display name', () => {
      expect(user.getDisplayName()).toBe('John Doe');

      user.name = '  Jane Smith  ';
      expect(user.getDisplayName()).toBe('Jane Smith');
    });

    it('should return correct role hierarchy', () => {
      const admin = new User({ ...validUserData, role: UserRole.ADMIN });
      const editor = new User({ ...validUserData, role: UserRole.EDITOR });
      const viewer = new User({ ...validUserData, role: UserRole.VIEWER });

      expect(admin.getRoleHierarchy()).toBe(3);
      expect(editor.getRoleHierarchy()).toBe(2);
      expect(viewer.getRoleHierarchy()).toBe(1);
    });

    it('should return safe object without sensitive methods', () => {
      const safeUser = user.toSafeObject();

      expect(safeUser.id).toBe(user.id);
      expect(safeUser.name).toBe(user.name);
      expect(safeUser.email).toBe(user.email);
      expect(safeUser.role).toBe(user.role);
      expect(safeUser.createdAt).toBe(user.createdAt);
      expect(safeUser.updatedAt).toBe(user.updatedAt);

      // Should not have updateTimestamp method
      expect('updateTimestamp' in safeUser).toBe(false);
    });
  });
});
