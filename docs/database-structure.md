# Database Structure

## Enums

Fields that require a closed set of values. Use these as Postgres/SQLite enums or Drizzle `pgEnum` / Zod enums.

```sql
-- Personnel
CREATE TYPE entity_type AS ENUM ('driver', 'staff');

CREATE TYPE staff_role AS ENUM (
  'aero',              -- Chief Aerodynamicist
  'mechanical',        -- Chief Mechanical Engineer
  'powertrain',        -- Chief Powertrain Engineer
  'race_engineer',
  'scout',             -- Head of Scouting
  'pit_crew'           -- Pit crew operator (Speed/Consistency/Focus)
);

CREATE TYPE driver_attr_name AS ENUM (
  -- Pace
  'qualifying', 'braking', 'cornering', 'traction', 'tyre_management',
  -- Racecraft
  'overtaking', 'defending', 'launch', 'traffic_navigation', 'wet_driving',
  -- Mental
  'composure', 'consistency', 'adaptability', 'focus', 'aggression',
  -- Technical
  'feedback', 'development', 'marketability', 'morale_balance', 'teamwork'
);

CREATE TYPE staff_attr_name AS ENUM (
  -- Aero
  'efficiency', 'packaging', 'stability', 'innovation', 'cfd_mapping',
  -- Mechanical
  'chassis', 'suspension', 'weight_optimization', 'reliability', 'damage_resistance',
  -- Powertrain
  'thermal_efficiency', 'harvesting', 'deployment', 'integration',
  -- Race Engineer
  'chemistry', 'setup', 'strategy', 'analysis',
  -- Scout
  'detection', 'accuracy', 'appraisal', 'leverage', 'coverage',
  -- Pit Crew
  'speed', 'consistency', 'focus_under_pressure'
  -- Note: 'reliability' and 'adaptability' overlap names across roles;
  -- store role-scoped attrs; resolve by staff.role at read time.
);

CREATE TYPE potential_tier AS ENUM ('bronze', 'silver', 'gold', 'elite');

-- Race weekend
CREATE TYPE session_type AS ENUM ('practice', 'qualifying_q1', 'qualifying_q2', 'qualifying_q3', 'race');

CREATE TYPE tire_compound AS ENUM ('soft', 'medium', 'hard', 'intermediate', 'wet');

CREATE TYPE race_result_status AS ENUM ('finished', 'dnf', 'dsq', 'dns', 'retired');

CREATE TYPE pace_directive AS ENUM ('conserve', 'balanced', 'push', 'maximum');

CREATE TYPE energy_directive AS ENUM ('harvest', 'balanced', 'overtake');

CREATE TYPE combat_order AS ENUM (
  'hold_traffic',
  'do_not_fight_teammate',
  'aggressive_overtake',
  'defend_position',
  'swap_positions'
);

CREATE TYPE track_moisture AS ENUM ('dry', 'damp', 'wet', 'flooded');

CREATE TYPE safety_car_state AS ENUM ('none', 'vsc', 'safety_car');

CREATE TYPE pit_error_type AS ENUM (
  'none',
  'jammed_wheel_nut',
  'cross_threaded_hub',
  'unsafe_release'
);

CREATE TYPE knowledge_trim_type AS ENUM (
  'qualifying_trim',
  'race_trim',
  'compound_knowledge',
  'wet_weather_trim'
);

-- Car / parts
CREATE TYPE part_slot AS ENUM (
  'front_wing',
  'rear_wing',
  'underfloor',
  'sidepods',
  'power_unit',
  'gearbox',
  'suspension'
);

CREATE TYPE manufacturing_status AS ENUM ('queued', 'fabricating', 'completed', 'cancelled');

CREATE TYPE r_and_d_focus AS ENUM ('current_car', 'next_year');

-- Corporate / finance
CREATE TYPE facility_type AS ENUM (
  'wind_tunnel',
  'cfd_lab',
  'design_studio',
  'weather_hub',
  'scouting_hq',
  'logistics_hub',
  'simulator',
  'fitness_center',
  'staff_academy',
  'foundry',
  'rig_testing',
  'powertrain_factory'
);

CREATE TYPE ledger_transaction_type AS ENUM (
  'sponsor_payout',
  'sponsor_bonus',
  'prize_money',
  'part_fabrication',
  'rd_testing',
  'salary',
  'staff_salary',
  'buyout_fee',
  'engine_lease',
  'engine_supply_fee',
  'facility_construction',
  'freight_travel',
  'marketing',
  'fine',
  'emergency_procurement',
  'hospitality'
);

CREATE TYPE sponsor_slot_type AS ENUM ('title', 'major', 'minor');

CREATE TYPE sponsor_payout_type AS ENUM ('upfront', 'per_race', 'bonus');

CREATE TYPE cost_cap_breach AS ENUM ('none', 'minor', 'major');

CREATE TYPE division_tier AS ENUM ('1', '2', '3');  -- or INTEGER 1–3 with CHECK

-- Calendar / world
CREATE TYPE regulation_impact AS ENUM ('minor_tweak', 'major_overhaul', 'category_ban');

CREATE TYPE ai_archetype AS ENUM (
  'aggressive_spender',
  'long_term_builder',
  'pragmatic_pivot'
);

CREATE TYPE contract_clause_type AS ENUM (
  'base_salary',
  'performance_bonus',
  'release_clause',
  'buyout_fee',
  'engineering_budget_guarantee',
  'number_1_status'
);
```

---

## Tables

```sql
-- Represents all active drivers and karting prospects
CREATE TABLE drivers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_code TEXT NOT NULL, -- ISO 3166-1 alpha-3
  birthplace TEXT NOT NULL,
  age INTEGER NOT NULL,
  team_id INTEGER, -- FK to teams(id); NULL if free agent / karting
  car_id INTEGER,  -- FK to cars(id); assigned seat
  is_karting BOOLEAN DEFAULT FALSE,
  potential_tier potential_tier, -- karting / junior prospects
  injury_proneness REAL NOT NULL,
  longevity INTEGER NOT NULL,
  morale REAL DEFAULT 50.0
);
```

```sql
CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_code TEXT NOT NULL,
  birthplace TEXT NOT NULL,
  role staff_role NOT NULL,
  team_id INTEGER,
  assigned_driver_id INTEGER, -- race_engineer → drivers(id)
  is_scouted BOOLEAN DEFAULT FALSE,
  morale REAL DEFAULT 50.0,
  ego REAL DEFAULT 50.0,
  loyalty REAL DEFAULT 50.0
);
```

```sql
CREATE TABLE attributes (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  entity_type entity_type NOT NULL,
  attr_name TEXT NOT NULL, -- driver_attr_name OR staff_attr_name (role-scoped)
  current_value INTEGER NOT NULL,
  ceiling INTEGER NOT NULL,
  UNIQUE (entity_id, entity_type, attr_name)
);
```

```sql
CREATE TABLE scouting_reports (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL, -- which team's scout network owns this report
  entity_id INTEGER NOT NULL,
  entity_type entity_type NOT NULL,
  confidence_level INTEGER DEFAULT 0, -- 0–100
  last_scout_date INTEGER
);
```

```sql
CREATE TABLE cars (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  car_number INTEGER NOT NULL, -- 1 or 2 typically
  power_unit_id INTEGER,       -- FK to parts where slot = power_unit
  UNIQUE (team_id, car_number)
);
```

```sql
CREATE TABLE race_events (
  id INTEGER PRIMARY KEY,
  calendar_id INTEGER NOT NULL,
  track_id INTEGER NOT NULL,
  session_type session_type NOT NULL,
  ambient_temp_c REAL,
  track_temp_c REAL,
  moisture track_moisture DEFAULT 'dry',
  safety_car_state safety_car_state DEFAULT 'none',
  track_grip_multiplier REAL DEFAULT 1.0,
  is_completed BOOLEAN DEFAULT FALSE
);
```

```sql
CREATE TABLE lap_data (
  id INTEGER PRIMARY KEY,
  race_event_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  lap_number INTEGER NOT NULL,
  lap_time_ms INTEGER NOT NULL,
  sector_1_ms INTEGER,
  sector_2_ms INTEGER,
  sector_3_ms INTEGER,
  tire_compound tire_compound,
  tire_wear_delta REAL,
  tire_core_temp REAL,
  pace_directive pace_directive,
  energy_directive energy_directive,
  fuel_remaining_kg REAL
);
```

```sql
CREATE TABLE race_results (
  id INTEGER PRIMARY KEY,
  race_event_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  finishing_position INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  grid_position INTEGER,
  status race_result_status
);
```

```sql
CREATE TABLE car_setup_snapshots (
  id INTEGER PRIMARY KEY,
  race_event_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  front_wing_id INTEGER,
  rear_wing_id INTEGER,
  underfloor_id INTEGER,
  sidepods_id INTEGER,
  -- Granular setup (Pillar 2)
  front_wing_angle REAL,
  rear_wing_angle REAL,
  front_arb INTEGER,
  rear_arb INTEGER,
  front_ride_height_mm REAL,
  rear_ride_height_mm REAL,
  front_camber REAL,
  rear_camber REAL,
  front_toe REAL,
  rear_toe REAL,
  brake_bias REAL,
  -- Derived physics influence
  downforce_level REAL,
  drag_level REAL,
  mechanical_balance REAL
);
```

```sql
CREATE TABLE session_knowledge (
  id INTEGER PRIMARY KEY,
  race_event_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  trim_type knowledge_trim_type NOT NULL,
  tire_compound tire_compound, -- for compound_knowledge
  tier INTEGER DEFAULT 0,      -- 0–3
  UNIQUE (race_event_id, team_id, driver_id, trim_type, tire_compound)
);
```

```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_code TEXT,
  liquid_cash REAL NOT NULL,
  cost_cap_limit REAL NOT NULL,
  cost_cap_spent REAL DEFAULT 0,
  engine_supplier_id INTEGER,    -- FK to suppliers(id)
  division INTEGER NOT NULL CHECK (division IN (1, 2, 3)),
  constructors_standing INTEGER,
  reputation REAL DEFAULT 50.0,
  rd_pivot_current REAL DEFAULT 1.0, -- 0–1 share on current car
  wt_hours_remaining REAL DEFAULT 0,
  cfd_hours_remaining REAL DEFAULT 0
);
```

```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  power_ceiling REAL NOT NULL,  -- straight-line power limit for lease customers
  annual_lease_fee REAL NOT NULL,
  is_works BOOLEAN DEFAULT FALSE
);
```

```sql
CREATE TABLE facilities (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  facility_type facility_type NOT NULL,
  tier INTEGER DEFAULT 0 CHECK (tier BETWEEN 0 AND 5),
  construction_finish_date INTEGER,
  is_under_construction BOOLEAN DEFAULT FALSE,
  operational_cost_annual REAL DEFAULT 0,
  UNIQUE (team_id, facility_type)
);
```

```sql
CREATE TABLE financial_ledger (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  transaction_type ledger_transaction_type NOT NULL,
  is_cost_cap_applicable BOOLEAN NOT NULL,
  season_index INTEGER NOT NULL,
  timestamp INTEGER NOT NULL
);
```

```sql
CREATE TABLE sponsors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_code TEXT,
  min_marketability INTEGER DEFAULT 0,
  min_team_standing INTEGER, -- NULL = no standing gate
  ethics_sensitivity REAL DEFAULT 0
);
```

```sql
CREATE TABLE sponsor_contracts (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  sponsor_id INTEGER NOT NULL, -- FK to sponsors
  slot_type sponsor_slot_type NOT NULL,
  payout_type sponsor_payout_type NOT NULL,
  amount REAL NOT NULL,
  bonus_target_position INTEGER, -- e.g. finish P8 or better
  remaining_races INTEGER,       -- NULL if multi-year / season-long
  years_remaining INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE blueprints (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  slot part_slot NOT NULL,
  name TEXT NOT NULL,
  performance_points INTEGER NOT NULL,
  base_reliability INTEGER NOT NULL,
  pitch_sensitivity REAL DEFAULT 0,
  drag_coefficient REAL DEFAULT 0,
  weight_kg REAL,
  season_year INTEGER NOT NULL,
  is_invalidated BOOLEAN DEFAULT FALSE -- post regulation overhaul
);
```

```sql
CREATE TABLE rd_projects (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  slot part_slot NOT NULL,
  focus r_and_d_focus NOT NULL,
  progress REAL DEFAULT 0,       -- 0–100 toward blueprint unlock
  allocated_wt_hours REAL DEFAULT 0,
  allocated_cfd_hours REAL DEFAULT 0,
  lead_designer_id INTEGER,      -- FK to staff
  resulting_blueprint_id INTEGER,
  status manufacturing_status NOT NULL -- reuse queued/fabricating/completed semantics
);
```

```sql
CREATE TABLE parts (
  id INTEGER PRIMARY KEY,
  blueprint_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  slot part_slot NOT NULL,
  current_reliability REAL NOT NULL,
  max_condition_ceiling REAL NOT NULL,
  weight_kg REAL NOT NULL,
  is_lightweight BOOLEAN DEFAULT FALSE,
  is_scrapped BOOLEAN DEFAULT FALSE,
  mounted_on_car_id INTEGER
);
```

```sql
CREATE TABLE freight_inventory (
  id INTEGER PRIMARY KEY,
  race_event_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  is_spare BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE manufacturing_queue (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  blueprint_id INTEGER NOT NULL,
  is_lightweight BOOLEAN DEFAULT FALSE,
  completion_date INTEGER NOT NULL,
  status manufacturing_status NOT NULL
);
```

```sql
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_code TEXT,
  length_km REAL,
  sector_count INTEGER DEFAULT 3,
  aero_efficiency_weight REAL NOT NULL,
  mechanical_grip_weight REAL NOT NULL,
  tire_abrasion_factor REAL NOT NULL,
  pit_loss_seconds REAL,
  base_grip REAL DEFAULT 0.95,
  max_grip REAL DEFAULT 1.02,
  climate_rain_probability REAL DEFAULT 0.15
);
```

```sql
CREATE TABLE season_calendar (
  id INTEGER PRIMARY KEY,
  season_year INTEGER NOT NULL,
  race_index INTEGER NOT NULL,
  track_id INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE (season_year, race_index)
);
```

```sql
CREATE TABLE championship_standings (
  id INTEGER PRIMARY KEY,
  season_year INTEGER NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_type entity_type NOT NULL, -- driver standings; use team via separate rows or entity_type extension
  team_id INTEGER,                  -- for constructors; set entity_type workaround or add 'team'
  points INTEGER DEFAULT 0,
  position INTEGER
);
```

```sql
CREATE TABLE ai_team_profiles (
  team_id INTEGER PRIMARY KEY,
  archetype ai_archetype NOT NULL,
  r_and_d_focus_bias REAL NOT NULL,
  facility_investment_rate REAL NOT NULL,
  cost_cap_risk_tolerance REAL NOT NULL
);
```

```sql
CREATE TABLE contracts (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  entity_type entity_type NOT NULL,
  team_id INTEGER NOT NULL,
  salary_annual REAL NOT NULL,
  years_remaining INTEGER NOT NULL,
  buyout_fee REAL DEFAULT 0,
  release_clause REAL,
  performance_bonus REAL,
  is_number_one BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE regulatory_history (
  id INTEGER PRIMARY KEY,
  season_year INTEGER NOT NULL,
  rule_description TEXT NOT NULL,
  impact_type regulation_impact NOT NULL,
  affected_slot part_slot, -- NULL = global
  performance_penalty_pct REAL NOT NULL, -- 10 / 40 / etc.
  is_active BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE regulation_votes (
  id INTEGER PRIMARY KEY,
  season_year INTEGER NOT NULL,
  proposal_id INTEGER NOT NULL, -- FK to regulatory_history or pending proposal
  team_id INTEGER NOT NULL,
  vote_for BOOLEAN NOT NULL,
  political_capital_spent REAL DEFAULT 0
);
```

---

## Implementation Notes (DuckDB / Drizzle)

- **Lightweight penalty:** On `manufacturing_queue` completion, insert into `parts` with lower initial `max_condition_ceiling` and higher `weight_kg` trade-off inverted when lightweight.
- **Permanent fatigue:** After each completed race weekend:

```sql
UPDATE parts
SET max_condition_ceiling = max_condition_ceiling - 5.0
WHERE mounted_on_car_id IS NOT NULL AND is_scrapped = FALSE;
```

- **Attr names:** `attributes.attr_name` is TEXT because driver vs staff enums differ; validate in app layer against `driver_attr_name` / `staff_attr_name` based on `entity_type` (+ `staff.role`).
- **Championship entity_type:** Prefer adding `'team'` to `entity_type` or splitting `driver_standings` / `constructor_standings` before implementation.
