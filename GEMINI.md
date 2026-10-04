# CR-Ship - Project Guidelines & Rules (Official Logo & Name)

## 1. Development & Communication Workflow
- **Strict Iterative Phase-by-Phase Execution**:
  1. Present the upcoming phase's features and technical details to the user.
  2. The user will provide feedback and custom requirements.
  3. Update the phase plan quickly and present the revised specification.
  4. Wait for user's explicit "Start" command before executing any code.
  5. After implementation, test thoroughly and provide the user with clear, step-by-step instructions to test and verify on their machine.
  6. Only proceed to the next phase when the user confirms 100% satisfaction.

## 2. Visual & Aesthetic Standards (Zero Grey Policy)
- **Classic Luxury Glassmorphism**:
  - NO plastic UI, NO cheap flat look.
  - Zero dull grey/slate tones. Never use faint low-opacity grey text.
  - Text must be crisp, high-contrast pure white (`#FFFFFF`) in dark mode, and deep navy (`#0F172A`) in light mode.
- **Harmonious 4-Color Vibrant Palette**:
  1. Electric Sapphire / Royal Indigo (`#6366F1` / `#4F46E5`)
  2. Amethyst Purple / Fuchsia (`#A855F7` / `#D97706` / `#E879F9`)
  3. Mint Emerald / Teal (`#10B981` / `#34D399`)
  4. Radiant Golden Amber (`#F59E0B` / `#FBBF24`)
- **Theme Support**:
  - Dark Mode: Cosmic Midnight Navy (`#080C18`) with glowing luminous ambient lighting orbs.
  - Light Mode: Eye-friendly Soft Ivory & Silk Mist (`#F4F6FB`) with gentle periwinkle borders and deep obsidian text (zero eye strain, zero glare).
- **Tabs**: Each tab has its own dedicated vibrant jewel-tone glowing icon and high-contrast text.

## 3. System Architecture & Database
- **Stealth / Normal for Students**:
  - The ~130 students do not need any app, portal, or login.
  - CR operates privately on `localhost:3000`. WhatsApp remains the outward broadcast channel (1-click ready-to-paste messages).
- **Flexible SQLite Database**:
  - Fast, offline-first SQLite file (`prisma/cr_nexus.db`).
  - Every model contains a `customFields` / `metadata` JSON field for schema evolution tolerance.
- **100% Searchable Permanent Audit Logs**:
  - Every action (create, update, delete, import, merge) is permanently logged to SQLite with timestamps and searchable metadata.
