# MedTracker — Entity Relationship Diagram (ERD)

> Backend: **Supabase (PostgreSQL)**. Renders automatically on GitHub.
> Source of truth: [`schema.sql`](./schema.sql).

```mermaid
erDiagram
    profiles ||--o{ patients          : "manages"
    profiles ||--o{ care_team          : "is member of"
    patients ||--o{ care_team          : "shared with"
    patients ||--o{ medications        : "has"
    patients ||--o{ vitals             : "records"
    patients ||--o{ journal_entries    : "logs"
    patients ||--o{ mood_logs          : "daily mood"
    patients ||--o{ achievements       : "unlocks"
    patients ||--o{ contacts           : "ICE info"
    medications ||--o{ medication_times : "reminders"
    medications ||--o{ doses           : "intakes"
    journal_entries ||--o{ journal_symptoms : "tags"

    profiles {
        uuid id PK "= auth.users.id"
        text full_name
        text email
        enum role "family|professional|self"
        text language
        text text_size
        text theme
        bool dark_mode
        timestamptz created_at
    }
    patients {
        uuid id PK
        uuid caregiver_id FK "-> profiles.id"
        text full_name
        text possessive_nick
        date birth_date
        text blood_type
        text weight
        text height
        text_array allergies
        text_array conditions
        text notes
        timestamptz created_at
    }
    care_team {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        uuid profile_id FK "-> profiles.id (nullable)"
        text name
        text relation
        enum role "manager|viewer"
        bool is_primary
        text invited_email
    }
    medications {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        text name
        text dose
        text color
        int qty
        bool archived
        timestamptz created_at
    }
    medication_times {
        uuid id PK
        uuid medication_id FK "-> medications.id"
        time time_of_day
    }
    doses {
        uuid id PK
        uuid medication_id FK "-> medications.id"
        timestamptz scheduled_at
        enum status "taken|missed|pending"
        timestamptz taken_at
    }
    vitals {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        enum type "bp|hr|weight|glucose|temp|spo2"
        numeric systolic
        numeric diastolic
        numeric value
        text notes
        timestamptz recorded_at
    }
    journal_entries {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        uuid medication_id FK "-> medications.id (nullable)"
        text body
        timestamptz recorded_at
    }
    journal_symptoms {
        uuid id PK
        uuid journal_id FK "-> journal_entries.id"
        text symptom
    }
    mood_logs {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        date log_date
        text mood
        text label
    }
    achievements {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        text achievement_key
        timestamptz unlocked_at
    }
    contacts {
        uuid id PK
        uuid patient_id FK "-> patients.id"
        enum type "emergency|doctor"
        text name
        text phone
        text relation
        text clinic
    }
```

**Access control (RLS).** Every table is row-level-secured. A caregiver
(`profiles.id = auth.uid()`) can reach a row only if they own the patient
(`patients.caregiver_id`) or appear in that patient's `care_team`. This is
enforced by the `can_access_patient()` helper used in all policies — patient
medical data is never exposed across accounts.
