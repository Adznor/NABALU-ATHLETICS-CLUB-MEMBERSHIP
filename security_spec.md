# Security Specification - Nabalu Athletics Club Registration System

## 1. Data Invariants
- A **Member** must have a unique `membershipId`.
- PII (IC Number, Phone, Address, Email) must only be readable by verified admins or the server.
- Publicly, only `fullName`, `membershipId`, `memberType`, `athleteType`, `status`, `photoBase64`, and `createdAt` should be visible in the list.
- A registration cannot be modified or deleted by the registrant once submitted (only Admins can verify or delete).

## 2. The "Dirty Dozen" Payloads (Deny Targets)
1. **Identity Spoofing**: Post a member with `membershipId: "ADMIN-001"` manually.
2. **PII Leak**: Querying for `icNumber` as a standard user.
3. **State Shortcut**: Creating a member with `status: "verified"`.
4. **ID Poisoning**: Creating a member with an ID longer than 128 characters.
5. **Mass Append**: Adding 100 unused fields to a member document.
6. **Self-Verification**: Updating own `status` from `pending` to `verified`.
7. **Resource Exhaustion**: Sending a 10MB `photoBase64` string.
8. **Orphaned Record**: Creating a member with a non-existent club setting reference.
9. **Timestamp Manipulation**: Providing a future `createdAt` date from the client.
10. **Data Type Confusion**: Sending `membershipNumber` as a string instead of a number.
11. **Admin Lockout**: Trying to delete the `settings/club` document.
12. **Blind Write**: Overwriting an existing member document without permission.

## 3. Relational Mapping
- **Members** are the primary entities.
- **Admin** access is controlled by the user email: `g-73273737@moe-dl.edu.my`.
- **Settings** are read-only for public, writeable only by Admin.
- **Counters** are incremented during the registration process (Creation).

## 4. Proposed Rules Structure
- `isValidMember(data)` helper for strict schema.
- `isAdmin()` check using `request.auth.token.email`.
- `allow list` for `members` will be restricted if PII is included in the document.
- *Wait*: Since the current structure puts PII in the same document as public info, we must either:
  1. Split the collection (Profile vs Private).
  2. Or restrict `read` to only `isAdmin()`.
- Given the user's request: "Penyimpanan pendaftaran boleh diakses dan setiap gambar boleh dilihat", it seems they want the list to be accessible. I will split the `Member` object logic or use `allow read` carefully.
- Actually, looking at the UI, the `MemberList` is only shown to the Admin or in "Semakan" (verification).
- If `MemberList` is for public "verification", users should only search for their own or see a safe list.
- I will implement a check where reading private fields is restricted.
