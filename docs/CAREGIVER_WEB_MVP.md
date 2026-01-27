# Flynn AAC Caregiver Web App — MVP Specification

**Version:** 1.0  
**Date:** January 2025  
**Status:** Draft  

---

## 1. Executive Summary

### Vision

The Flynn AAC Caregiver Web App is a comprehensive therapy management and progress tracking platform designed to support families and therapists working with children who use AAC (Augmentative and Alternative Communication). It serves as the companion to the Flynn AAC iOS app, providing:

1. **Session logging** across multiple therapy disciplines (ABA, OT, SLP)
2. **Progress visualization** with graphs and milestone tracking
3. **AAC usage analytics** synced from the iOS app
4. **Primitive reflex integration** tracking
5. **Collaboration tools** between caregivers and therapists

### Relationship to iOS AAC App

```
┌─────────────────────┐         ┌─────────────────────┐
│   Flynn AAC iOS     │         │  Caregiver Web App  │
│   (Child-facing)    │ ──sync──│  (Adult-facing)     │
│                     │         │                     │
│ • Symbol grid       │         │ • Session logging   │
│ • Phrase building   │         │ • Progress tracking │
│ • TTS output        │         │ • Analytics         │
│ • Usage logging     │         │ • Therapy notes     │
└─────────────────────┘         └─────────────────────┘
                    │                     │
                    └───────┬─────────────┘
                            │
                    ┌───────▼───────┐
                    │  Flynn API    │
                    │  (Backend)    │
                    └───────────────┘
```

The iOS app is the child's communication tool. The web app is the adult's management tool. They share data but serve different users with different needs.

### Target Users

| User Type | Primary Use Case | Key Needs |
|-----------|-----------------|-----------|
| **Primary Caregiver** | Daily therapy support, progress monitoring | Simple logging, visual progress, collaboration with therapists |
| **ABA Therapist** | Behavior tracking, skill acquisition data | Precise data points, graphs, session notes |
| **Occupational Therapist** | Motor skills, sensory processing, daily living | Goal tracking, routine integration, reflex assessment |
| **Speech-Language Pathologist** | Language development, AAC coordination | Session notes, vocabulary tracking, articulation data |
| **Multi-Client Therapist** | Caseload management | Client switching, batch reporting, schedule integration |

### Why This Matters (Bulgaria Context)

From market research, Bulgaria has:
- **10,000-15,000** children who could benefit from AAC
- **Limited SLP availability** (mostly urban centers)
- **No Bulgarian-native AAC apps** (blue ocean opportunity)
- **Strong diaspora** in UK, Germany, Spain (higher purchasing power)

The web app enables:
- Remote therapy support for rural families
- Coordination between parents and urban-based therapists
- Data-driven therapy optimization
- Professional therapy documentation (for insurance/funding)

---

## 2. User Personas

### 2.1 Primary Caregiver (Parent/Guardian)

**Profile: Galya, 34, Sofia**
- Mother of Flynn, age 5, non-speaking autistic child
- Works part-time from home
- Coordinates between 3 therapists (ABA, OT, SLP)
- Tech-comfortable but time-poor

**Goals:**
- Track Flynn's daily communication attempts
- Log home therapy practice sessions
- Share progress with therapists before appointments
- See visual proof of progress (for motivation)
- Coordinate with grandparents who also work with Flynn

**Pain Points:**
- Paper notebooks get lost
- Hard to remember what happened last week
- Therapists ask questions she can't answer
- No way to see long-term trends
- Different therapists use different tracking methods

**Feature Priorities:**
- Simple, fast session logging (< 2 minutes)
- Dashboard showing recent activity
- Easy sharing with therapists
- Mobile-responsive for phone use

---

### 2.2 ABA Therapist (BCBA/RBT)

**Profile: Maria, 28, Plovdiv**
- Board Certified Behavior Analyst
- Private practice, 12 active clients
- Does home visits and clinic sessions
- Required to document everything for insurance

**Goals:**
- Log discrete trial data efficiently
- Track skill acquisition across programs
- Document problem behaviors with ABC data
- Generate progress reports for families and funders
- Maintain treatment integrity data

**Pain Points:**
- Current data collection is paper-based
- Entering data later leads to errors
- Different clients = different tracking systems
- Report generation takes hours
- Hard to show progress to skeptical families

**Feature Priorities:**
- Quick trial-by-trial data entry
- Behavior tracking with ABC format
- Automatic graphing
- Report generation
- Multi-client dashboard

---

### 2.3 Occupational Therapist

**Profile: Dimitar, 42, Varna**
- Pediatric OT with sensory integration specialty
- Works at rehabilitation center
- Sees children with autism, CP, developmental delays
- Uses primitive reflex integration in practice

**Goals:**
- Track fine motor milestones
- Document sensory profile changes
- Log primitive reflex assessment results
- Monitor daily living skill development
- Share home program compliance with parents

**Pain Points:**
- Reflex assessments live in separate notebooks
- Parents forget home program exercises
- No standardized way to track sensory changes
- Hard to show incremental progress

**Feature Priorities:**
- Reflex assessment tracking
- Sensory profile logging
- Fine/gross motor milestone tracking
- Home program assignment and tracking
- Photo/video attachment for demonstrations

---

### 2.4 Speech-Language Pathologist (Логопед)

**Profile: Elena, 35, Sofia**
- Licensed SLP with AAC specialty
- One of few Bulgarian AAC specialists
- Consults remotely with families across Bulgaria
- Coordinates AAC device programming

**Goals:**
- Track language goals beyond AAC (articulation, receptive language)
- See AAC usage data from home use
- Document session progress
- Recommend vocabulary additions based on data
- Coordinate with other therapy providers

**Pain Points:**
- Can't see how child uses AAC at home
- Parents report inconsistently
- No Bulgarian AAC resources exist
- Travel for consultations is expensive

**Feature Priorities:**
- AAC usage analytics from iOS app
- Vocabulary growth visualization
- Remote consultation notes
- Goal tracking across domains (AAC + speech)
- Caregiver assignment of practice activities

---

### 2.5 Multi-Client Therapist (Caseload Manager)

**Profile: Private Therapy Center, Sofia**
- 5 therapists across ABA, OT, SLP
- 40+ active clients
- Needs unified data platform
- Reports to funding bodies

**Goals:**
- Single platform for all therapists and clients
- Aggregate reporting for center metrics
- Scheduling integration
- Billing documentation
- Quality assurance monitoring

**Pain Points:**
- Each therapist uses different tools
- Client handoffs lose information
- Reporting is manual and error-prone
- No way to benchmark across clients

**Feature Priorities:**
- Multi-client dashboard
- Role-based access control
- Report templates
- Data export for compliance
- Team collaboration features

---

## 3. Core Features (MVP)

### 3.1 Dashboard with Child Overview

**Description:**  
Central hub showing recent activity, upcoming sessions, and key metrics for each child.

**User Stories:**
- As a caregiver, I want to see Flynn's communication attempts this week so I can track trends
- As a therapist, I want to see a snapshot of a client before a session
- As a parent, I want to see which therapists have logged sessions recently

**Data Model:**
```typescript
interface ChildProfile {
  id: string;
  name: string;
  dateOfBirth: Date;
  diagnoses: string[];
  avatarUrl?: string;
  therapists: TherapistAssignment[];
  caregivers: CaregiverAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardSnapshot {
  childId: string;
  dateRange: DateRange;
  aacTapsCount: number;
  uniqueWordsUsed: number;
  sessionCount: number;
  recentMilestones: Milestone[];
  upcomingSessions: Session[];
}
```

**Priority:** P0 (Must Have)

---

### 3.2 Therapy Session Logging

**Description:**  
Unified session logging for ABA, OT, and SLP with discipline-specific fields.

**User Stories:**
- As an ABA therapist, I want to log discrete trial data quickly
- As an OT, I want to record reflex assessment results
- As an SLP, I want to note articulation targets practiced
- As a caregiver, I want to log a quick practice session at home

**Data Model:**
```typescript
interface TherapySession {
  id: string;
  childId: string;
  providerId: string;
  sessionType: 'ABA' | 'OT' | 'SLP' | 'HOME_PRACTICE' | 'OTHER';
  startTime: Date;
  endTime: Date;
  location: 'HOME' | 'CLINIC' | 'SCHOOL' | 'REMOTE';
  notes: string;
  goals: SessionGoal[];
  attachments: Attachment[];
  createdAt: Date;
}

interface SessionGoal {
  goalId: string;
  trialsAttempted?: number;
  trialsCorrect?: number;
  promptLevel?: PromptLevel;
  notes?: string;
}

type PromptLevel = 'INDEPENDENT' | 'GESTURAL' | 'VERBAL' | 'MODEL' | 'PARTIAL_PHYSICAL' | 'FULL_PHYSICAL';
```

**Priority:** P0 (Must Have)

---

### 3.3 Progress Visualization

**Description:**  
Graphs and charts showing progress over time for skills, behaviors, and milestones.

**User Stories:**
- As a caregiver, I want to see Flynn's word count growth over months
- As an ABA therapist, I want to graph mastery criteria progress
- As an OT, I want to visualize reflex integration improvement
- As an SLP, I want to show vocabulary expansion to parents

**Key Visualizations:**
- Line graphs for skill acquisition
- Bar charts for session frequency
- Milestone timelines
- Cumulative vocabulary growth (from AAC)
- Behavior frequency trends

**Priority:** P0 (Must Have)

---

### 3.4 AAC Usage Analytics (iOS App Sync)

**Description:**  
Data synced from Flynn AAC iOS app showing actual communication patterns.

**User Stories:**
- As an SLP, I want to see which words Flynn uses most often
- As a caregiver, I want to know if Flynn is using the new vocabulary we added
- As a therapist, I want to identify communication breakdowns

**Data Model:**
```typescript
interface AACUsageEvent {
  id: string;
  childId: string;
  deviceId: string;
  timestamp: Date;
  eventType: 'SYMBOL_TAP' | 'PHRASE_SPOKEN' | 'CATEGORY_NAVIGATION';
  symbolId?: string;
  phrase?: string;
  language: 'en' | 'bg';
}

interface AACAnalytics {
  childId: string;
  dateRange: DateRange;
  totalTaps: number;
  uniqueSymbols: number;
  topSymbols: SymbolUsage[];
  topCategories: CategoryUsage[];
  languageDistribution: { en: number; bg: number };
  hourlyDistribution: number[]; // 24 buckets
}
```

**Priority:** P0 (Must Have)

---

### 3.5 Primitive Reflex Tracking

**Description:**  
Specialized tracking for primitive reflex assessment and integration progress.

**User Stories:**
- As an OT, I want to record initial reflex assessment scores
- As a caregiver, I want to log home reflex integration exercises
- As a therapist, I want to see which reflexes have improved over time

**Data Model:**
```typescript
interface ReflexAssessment {
  id: string;
  childId: string;
  assessorId: string;
  assessmentDate: Date;
  reflexScores: ReflexScore[];
  notes: string;
}

interface ReflexScore {
  reflexType: ReflexType;
  score: 0 | 1 | 2 | 3 | 4; // 0=absent/integrated, 4=strongly present
  side?: 'LEFT' | 'RIGHT' | 'BOTH';
  notes?: string;
}

type ReflexType = 
  | 'MORO' 
  | 'ATNR' 
  | 'STNR' 
  | 'TLR_FORWARD' 
  | 'TLR_BACKWARD'
  | 'PALMAR_GRASP'
  | 'PLANTAR_GRASP'
  | 'ROOTING'
  | 'SPINAL_GALANT'
  | 'BABINSKI'
  | 'LANDAU';
```

**Priority:** P1 (Should Have)

---

### 3.6 Multi-Child Support

**Description:**  
Parents with multiple children (or complex family situations) can manage multiple profiles.

**User Stories:**
- As a parent of twins, I want to track both children's progress
- As a guardian, I want to manage my nephew and niece's therapy
- As a caregiver, I want to quickly switch between child profiles

**Priority:** P1 (Should Have)

---

### 3.7 Multi-Client Support (Therapist Mode)

**Description:**  
Therapists managing caseloads can switch between clients and view aggregate data.

**User Stories:**
- As a BCBA with 15 clients, I want to see all upcoming sessions
- As an OT, I want to filter my caseload by goal type
- As a center director, I want to see therapist productivity metrics

**Data Model:**
```typescript
interface TherapistCaseload {
  therapistId: string;
  clients: CaseloadClient[];
  totalSessions: number;
  upcomingSessions: Session[];
}

interface CaseloadClient {
  childId: string;
  childName: string;
  assignmentDate: Date;
  serviceType: string;
  lastSessionDate?: Date;
  nextSessionDate?: Date;
  status: 'ACTIVE' | 'ON_HOLD' | 'DISCHARGED';
}
```

**Priority:** P2 (Nice to Have for MVP)

---

### 3.8 Therapist-Caregiver Data Sharing

**Description:**  
Secure sharing of progress data between therapists and caregivers.

**User Stories:**
- As a therapist, I want to share a progress report with parents
- As a caregiver, I want to give my new therapist access to historical data
- As a provider, I want to control what data caregivers can see

**Sharing Model:**
- Invite-based access (email invitation)
- Role-based permissions (VIEW, EDIT, ADMIN)
- Audit log of who accessed what
- Revocable access

**Priority:** P1 (Should Have)

---

## 4. Therapy-Specific Sections

### 4.1 ABA Therapy Integration

#### Background: What is ABA?

Applied Behavior Analysis (ABA) is an evidence-based therapy approach for autism that focuses on:
- **Increasing helpful behaviors** (communication, social skills, self-care)
- **Decreasing harmful behaviors** (self-injury, aggression, elopement)
- **Teaching new skills** through systematic reinforcement

ABA is delivered by Board Certified Behavior Analysts (BCBAs) and Registered Behavior Technicians (RBTs).

#### Session Structure

A typical ABA session includes:
1. **Discrete Trial Training (DTT)** — Structured skill teaching
2. **Natural Environment Training (NET)** — Skills in natural context
3. **Behavior data collection** — Tracking target behaviors
4. **Reinforcement delivery** — Rewards for correct responses

#### Data Points to Track

| Data Type | Description | Format |
|-----------|-------------|--------|
| **Trial Data** | Correct/incorrect responses per skill | Trials: 8/10 correct |
| **Prompt Level** | Amount of help needed | Independent → Full Physical |
| **Behavior Frequency** | Count of target behaviors | 3 instances of elopement |
| **ABC Data** | Antecedent-Behavior-Consequence | What happened before/during/after |
| **Duration** | How long a behavior lasted | 45 seconds |
| **Latency** | Time between instruction and response | 3 seconds |
| **Task Analysis** | Steps completed in a chain | 7/12 steps independent |

#### Skill Acquisition Tracking

```typescript
interface ABASkillProgram {
  id: string;
  childId: string;
  skillDomain: 'LANGUAGE' | 'SOCIAL' | 'SELF_CARE' | 'MOTOR' | 'ACADEMIC' | 'PLAY';
  skillName: string;
  targetDescription: string;
  masteryCriteria: string; // e.g., "80% across 3 consecutive sessions"
  currentPhase: number;
  phases: SkillPhase[];
  status: 'ACQUISITION' | 'MAINTENANCE' | 'GENERALIZATION' | 'MASTERED';
  startDate: Date;
  masteryDate?: Date;
}

interface SkillPhase {
  phaseNumber: number;
  description: string;
  targets: string[];
  promptHierarchy: PromptLevel[];
}
```

#### Behavior Tracking (ABC Format)

```typescript
interface BehaviorIncident {
  id: string;
  sessionId: string;
  timestamp: Date;
  behaviorType: string; // e.g., "elopement", "self-injury", "aggression"
  antecedent: string;   // What happened before
  behavior: string;     // What the behavior looked like
  consequence: string;  // What happened after
  duration?: number;    // Seconds
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH';
  functionHypothesis?: 'ESCAPE' | 'ATTENTION' | 'TANGIBLE' | 'SENSORY';
}
```

#### Graph/Report Requirements

- **Cumulative record** — Correct responses over time
- **Percentage graphs** — Accuracy per program
- **Phase change lines** — When targets changed
- **Trend lines** — Direction of progress
- **Weekly/monthly summaries** for parent review

---

### 4.2 Occupational Therapy Integration

#### Background: OT for Autism

Occupational therapy helps children develop skills for "occupations" (daily activities):
- **Fine motor skills** — Handwriting, utensil use, buttoning
- **Gross motor skills** — Balance, coordination, strength
- **Sensory processing** — Managing sensory input
- **Self-care** — Dressing, toileting, feeding
- **Play skills** — Appropriate toy use, imagination

#### Goal Categories

```typescript
type OTGoalCategory = 
  | 'FINE_MOTOR'
  | 'GROSS_MOTOR'
  | 'SENSORY_PROCESSING'
  | 'SELF_CARE'
  | 'VISUAL_MOTOR'
  | 'BILATERAL_COORDINATION'
  | 'HANDWRITING'
  | 'FEEDING'
  | 'DRESSING'
  | 'PLAY_SKILLS';

interface OTGoal {
  id: string;
  childId: string;
  category: OTGoalCategory;
  shortTermGoal: string;
  longTermGoal: string;
  baseline: string;
  targetCriteria: string;
  measurementMethod: string;
  startDate: Date;
  targetDate: Date;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'DISCONTINUED';
}
```

#### Daily Routine Tracking

OT often focuses on integrating skills into daily routines:

```typescript
interface RoutineActivity {
  id: string;
  childId: string;
  routineName: string; // e.g., "Morning routine"
  activities: RoutineStep[];
}

interface RoutineStep {
  order: number;
  activity: string; // e.g., "Brush teeth"
  supportLevel: 'INDEPENDENT' | 'SETUP' | 'VERBAL_CUE' | 'PHYSICAL_ASSIST' | 'HAND_OVER_HAND';
  notes?: string;
}

interface RoutineLog {
  routineId: string;
  date: Date;
  completedSteps: { stepOrder: number; supportLevel: string }[];
  totalTime?: number;
  notes?: string;
}
```

#### Sensory Profile Notes

```typescript
interface SensoryProfile {
  childId: string;
  assessmentDate: Date;
  domains: SensoryDomain[];
  triggers: SensoryTrigger[];
  strategies: SensoryStrategy[];
}

interface SensoryDomain {
  domain: 'AUDITORY' | 'VISUAL' | 'TACTILE' | 'VESTIBULAR' | 'PROPRIOCEPTIVE' | 'ORAL';
  sensitivity: 'HYPO' | 'TYPICAL' | 'HYPER';
  notes: string;
}

interface SensoryTrigger {
  trigger: string;
  response: string;
  strategies: string[];
}
```

#### Fine/Gross Motor Milestones

Standard developmental milestones with tracking:

```typescript
interface MotorMilestone {
  id: string;
  category: 'FINE' | 'GROSS';
  name: string;
  typicalAgeMonths: number;
  description: string;
}

interface MilestoneProgress {
  childId: string;
  milestoneId: string;
  status: 'NOT_STARTED' | 'EMERGING' | 'DEVELOPING' | 'ACHIEVED';
  dateAchieved?: Date;
  notes?: string;
}
```

---

### 4.3 Primitive Reflex Integration

#### Background: What Are Primitive Reflexes?

Primitive reflexes are automatic movement patterns present at birth that typically integrate (become suppressed) during the first year of life. When these reflexes remain active (retained), they can interfere with:
- Motor development
- Attention and focus
- Emotional regulation
- Learning

Many children with autism have retained primitive reflexes that benefit from integration therapy.

#### Key Reflexes to Track

| Reflex | Normal Integration Age | Signs of Retention |
|--------|----------------------|-------------------|
| **Moro Reflex** | 2-4 months | Hypersensitivity, anxiety, poor emotional control |
| **ATNR (Asymmetrical Tonic Neck Reflex)** | 6 months | Poor hand-eye coordination, difficulty crossing midline |
| **STNR (Symmetrical Tonic Neck Reflex)** | 9-11 months | W-sitting, difficulty transitioning, poor posture |
| **TLR (Tonic Labyrinthine Reflex)** | 3-3.5 years | Balance problems, motion sickness, poor posture |
| **Palmar Grasp** | 2-3 months | Difficulty with fine motor, immature pencil grip |
| **Plantar Grasp** | 7-9 months | Walking on toes, foot sensitivity |
| **Spinal Galant** | 3-9 months | Fidgeting, bedwetting, difficulty sitting still |
| **Rooting Reflex** | 3-4 months | Oral sensitivities, speech difficulties |
| **Babinski Reflex** | 12-24 months | Walking issues, balance problems |
| **Landau Reflex** | 3 years | Poor posture, low muscle tone |

#### Assessment Recording

```typescript
interface ReflexAssessment {
  id: string;
  childId: string;
  assessorId: string;
  assessmentDate: Date;
  assessmentType: 'INITIAL' | 'PROGRESS' | 'DISCHARGE';
  reflexScores: ReflexScore[];
  overallNotes: string;
  recommendations: string[];
  nextAssessmentDate?: Date;
}

interface ReflexScore {
  reflexType: ReflexType;
  score: ReflexIntensity;
  side?: 'LEFT' | 'RIGHT' | 'BILATERAL';
  testingNotes: string;
  exercisesAssigned: string[];
}

// Scoring: 0 = integrated, 1 = minimal, 2 = mild, 3 = moderate, 4 = severe
type ReflexIntensity = 0 | 1 | 2 | 3 | 4;
```

#### Integration Exercise Tracking

```typescript
interface ReflexExercise {
  id: string;
  reflexType: ReflexType;
  exerciseName: string;
  description: string;
  frequency: string; // e.g., "2x daily for 4 weeks"
  videoUrl?: string;
  imageUrl?: string;
}

interface ExerciseLog {
  childId: string;
  exerciseId: string;
  date: Date;
  completed: boolean;
  duration?: number;
  notes?: string;
  performedBy: 'CHILD' | 'WITH_CAREGIVER' | 'WITH_THERAPIST';
}
```

#### Progress Visualization

- **Radar chart** — All reflexes at a glance (scores 0-4)
- **Timeline** — Assessment scores over time per reflex
- **Exercise compliance** — Calendar heatmap of home exercises

---

### 4.4 SLP Integration

#### Background: SLP for Autism

Speech-Language Pathologists (SLPs/Логопеди) work on communication broadly:
- **Expressive language** — What the child produces (including AAC)
- **Receptive language** — Understanding of language
- **Pragmatics** — Social use of language
- **Articulation/Phonology** — Speech sound production
- **Fluency** — Stuttering
- **Voice** — Vocal quality

For AAC users, SLP goals extend beyond the device.

#### Goals Beyond AAC

```typescript
interface SLPGoal {
  id: string;
  childId: string;
  domain: SLPDomain;
  goalText: string;
  shortTermObjectives: string[];
  baseline: string;
  criterion: string;
  status: 'ACTIVE' | 'MASTERED' | 'MODIFIED' | 'DISCONTINUED';
}

type SLPDomain = 
  | 'EXPRESSIVE_LANGUAGE'
  | 'RECEPTIVE_LANGUAGE'
  | 'PRAGMATICS'
  | 'ARTICULATION'
  | 'PHONOLOGY'
  | 'FLUENCY'
  | 'VOICE'
  | 'AAC'
  | 'FEEDING_SWALLOWING';
```

#### Session Notes Structure

```typescript
interface SLPSessionNote {
  sessionId: string;
  goalsAddressed: SLPGoalProgress[];
  activitiesUsed: string[];
  aacIntegration: {
    deviceUsed: boolean;
    wordsModeled: string[];
    spontaneousUse: string[];
    programmingChanges: string[];
  };
  parentEducation: string[];
  recommendations: string[];
}

interface SLPGoalProgress {
  goalId: string;
  trialsOrOpportunities: number;
  correctResponses: number;
  promptLevel: PromptLevel;
  notes: string;
}
```

#### Vocabulary Growth Tracking (from AAC App)

Key metrics from iOS app sync:

```typescript
interface VocabularyAnalytics {
  childId: string;
  period: DateRange;
  
  // Core metrics
  totalUniqueWords: number;
  newWordsThisPeriod: string[];
  mostUsedWords: { word: string; count: number }[];
  
  // Categories
  nounCount: number;
  verbCount: number;
  adjectiveCount: number;
  socialWordCount: number;
  
  // Complexity
  averagePhraseLength: number;
  multiWordUtterances: number;
  
  // Language distribution (for bilingual tracking)
  bulgarianWordCount: number;
  englishWordCount: number;
  codeSwitchingInstances: number;
}
```

#### Articulation/Phonology Tracking

```typescript
interface ArticulationTarget {
  id: string;
  childId: string;
  targetSound: string; // e.g., "/s/", "/r/", "СТ"
  position: 'INITIAL' | 'MEDIAL' | 'FINAL' | 'BLEND';
  level: 'ISOLATION' | 'SYLLABLE' | 'WORD' | 'PHRASE' | 'SENTENCE' | 'CONVERSATION';
  accuracy: number; // percentage
  notes: string;
}

interface PhonologicalProcess {
  processType: string; // e.g., "fronting", "stopping", "cluster reduction"
  examples: string[];
  status: 'PRESENT' | 'RESOLVING' | 'RESOLVED';
}
```

---

## 5. Data Architecture

### 5.1 Relationship Between iOS App and Web App

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   iOS App        │      │   API Server     │      │   Web App        │
│   (Swift)        │─────▶│   (Node.js)      │◀─────│   (TanStack)     │
│                  │      │                  │      │                  │
│ Writes:          │      │ Stores:          │      │ Reads/Writes:    │
│ • Usage events   │      │ • All data       │      │ • Sessions       │
│ • Device ID      │      │ • User auth      │      │ • Goals          │
│                  │      │ • Analytics      │      │ • Analytics      │
│ Reads:           │      │                  │      │                  │
│ • Vocabulary     │      │ Processes:       │      │ Reads:           │
│ • Settings sync  │      │ • Aggregations   │      │ • AAC events     │
└──────────────────┘      │ • Reports        │      │ • Progress       │
                          └──────────────────┘      └──────────────────┘
```

### 5.2 Sync Strategy

**iOS → Server (Write-only for usage data):**
- Batch upload every 5 minutes when online
- Queue events offline, sync when connected
- Compress event batches to minimize bandwidth
- Device ID links events to child profile

**Server → iOS (Settings sync):**
- Vocabulary customizations
- Hidden cards configuration
- Language preferences

**Web ↔ Server (Full CRUD):**
- Real-time updates via WebSocket for dashboards
- Optimistic updates for responsiveness
- Conflict resolution: last-write-wins with audit log

### 5.3 Multi-Tenant Design for Therapists

```typescript
interface Organization {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'PRACTICE' | 'CENTER' | 'SCHOOL';
  members: OrganizationMember[];
  clients: OrganizationClient[];
}

interface OrganizationMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'THERAPIST' | 'ASSISTANT';
  permissions: Permission[];
}

interface OrganizationClient {
  childId: string;
  assignedTherapists: string[]; // User IDs
  consentStatus: 'PENDING' | 'ACTIVE' | 'REVOKED';
  dataShareLevel: 'FULL' | 'SESSION_ONLY' | 'SUMMARY_ONLY';
}
```

### 5.4 Privacy Considerations

**HIPAA-Adjacent Requirements:**
- All data encrypted at rest and in transit
- Audit log for all data access
- User consent tracking for data sharing
- Data retention policies (configurable per region)
- Right to deletion (GDPR compliance)
- No PHI in logs or analytics

**Bulgarian Specific:**
- Personal Data Protection Act compliance
- Consider EU General Data Protection Regulation (GDPR)
- Data residency options (EU servers)

**AAC-Specific Privacy:**
> "AAC users have an absolute right to privacy regarding what they say."
- Option to disable usage logging
- No analysis of message content without explicit consent
- Aggregate analytics only (not individual phrases)

---

## 6. Technical Stack

### 6.1 Framework: TanStack Start

**Confirmed Choice:** TanStack Start (React-based, full-stack TypeScript)

**Why TanStack Start:**
- Type-safe routing with TanStack Router
- Full-stack React with server functions
- Excellent DX with hot module replacement
- Strong TypeScript integration
- Growing ecosystem and community

### 6.2 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | TanStack Start + React 19 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | TanStack Query (server state) + Zustand (client state) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts or Visx |
| **Backend** | TanStack Start server functions |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM |
| **Auth** | Clerk or Auth.js |
| **Hosting** | Vercel or Railway |
| **File Storage** | Cloudflare R2 or S3 |

### 6.3 API Integration with Existing Backend

**Current Backend:** (From progress.txt - appears to be in development)

**API Design:**
- RESTful endpoints for CRUD operations
- WebSocket for real-time dashboard updates
- Rate limiting per user/organization
- API versioning (v1 prefix)

**Key Endpoints:**
```
POST   /api/v1/sessions          # Create therapy session
GET    /api/v1/children/:id/dashboard  # Dashboard data
GET    /api/v1/children/:id/analytics  # AAC analytics
POST   /api/v1/assessments       # Create reflex assessment
GET    /api/v1/goals             # List goals with filters
```

### 6.4 Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Clerk   │───▶│  App     │
│          │    │  /Auth.js│    │          │
│ 1. Login │    │          │    │ 3. JWT   │
│ (email/  │    │ 2. OAuth │    │ validated│
│  Google) │    │ verify   │    │ session  │
└──────────┘    └──────────┘    └──────────┘
```

**User Types:**
- **Caregiver** — Can view own children, invite therapists
- **Therapist** — Can view assigned clients, full session CRUD
- **Organization Admin** — Can manage all organization data
- **Child** (future) — Limited self-tracking dashboard

---

## 7. Phased Roadmap

### Phase 1: Core Dashboard + Session Logging (MVP)
**Duration:** 8-12 weeks  
**Goal:** Functional caregiver tool with basic therapy tracking

**Deliverables:**
- [ ] User authentication (Clerk)
- [ ] Child profile creation and management
- [ ] Dashboard with overview cards
- [ ] Basic session logging (all therapy types)
- [ ] Simple goal tracking
- [ ] Mobile-responsive design

**Success Metrics:**
- 20 beta families onboarded
- 100+ sessions logged
- < 2 minute average session logging time

---

### Phase 2: AAC Analytics Integration
**Duration:** 6-8 weeks  
**Goal:** Connect iOS app data to web analytics

**Deliverables:**
- [ ] iOS app sync implementation
- [ ] AAC usage dashboard
- [ ] Vocabulary growth charts
- [ ] Word frequency reports
- [ ] Language distribution (BG/EN) tracking

**Success Metrics:**
- Real-time sync within 5 minutes
- 90% of iOS users connected
- Analytics load in < 2 seconds

---

### Phase 3: Advanced Therapy Features
**Duration:** 8-10 weeks  
**Goal:** Full therapy-specific functionality

**Deliverables:**
- [ ] ABA discrete trial data entry
- [ ] ABA graphing and reports
- [ ] Primitive reflex assessment tool
- [ ] OT milestone tracking
- [ ] SLP articulation tracking
- [ ] Progress reports (PDF export)

**Success Metrics:**
- ABA therapist adoption
- Report generation used by 50%+ therapists
- Reflex tracking validated by OT

---

### Phase 4: Multi-Client Therapist Features
**Duration:** 6-8 weeks  
**Goal:** Scale to therapy centers and caseloads

**Deliverables:**
- [ ] Therapist caseload dashboard
- [ ] Multi-client switching
- [ ] Organization management
- [ ] Team collaboration features
- [ ] Batch reporting

**Success Metrics:**
- 3+ therapy centers onboarded
- Average caseload of 10+ clients per therapist
- 50% reduction in reporting time

---

### Phase 5: AI-Powered Insights (Future)
**Duration:** TBD  
**Goal:** Intelligent recommendations and predictions

**Potential Features:**
- Skill acquisition predictions
- Vocabulary recommendation engine
- Behavior pattern detection
- Automated progress summaries
- Cross-child benchmarking (anonymized)

**Note:** Per roadmap doc on LLM safety:
> "For a young child's primary communication system, LLM-generated content introduces unacceptable risks."

AI features must be:
- Developer/therapist-facing, not child-facing
- Validated by humans before action
- Transparent in methodology

---

## 8. Open Questions

### For Sean/Galya

1. **User Onboarding:** How do therapists find and onboard new clients? Invite codes? Shared links?

2. **Pricing Model:** 
   - Free for caregivers, paid for therapists?
   - Freemium with analytics as premium?
   - Per-seat for organizations?

3. **Data Ownership:** When a family switches therapists, what happens to historical data?

4. **Offline Web Support:** Do caregivers need offline session logging? (PWA?)

5. **Bulgarian SLP Consultation:** Do we have a Bulgarian логопед to validate SLP features?

6. **ARASAAC Integration:** Can we show ARASAAC symbols in web reports? Licensing?

7. **Notification Preferences:** How should we notify caregivers of therapist updates? (Email, push, in-app?)

8. **Multi-Language UI:** Should the web app be bilingual (Bulgarian/English) like the iOS app?

### Research Gaps

1. **Bulgarian Therapy Standards:** What documentation is required for Bulgarian insurance/funding?

2. **GDPR Specifics:** Do we need a Data Protection Officer for Bulgaria operations?

3. **Therapy Center Workflows:** Shadow a Bulgarian therapy center to understand their current systems.

4. **Parent Tech Literacy:** What devices/browsers do Bulgarian parents typically use?

### Technical Decisions Pending

1. **Real-time vs. Polling:** WebSocket for live dashboards or periodic polling?

2. **Mobile App vs. PWA:** Should we build native mobile apps or PWA for caregiver web app?

3. **PDF Generation:** Server-side (Puppeteer) or client-side (jsPDF)?

4. **Video Attachments:** Do we need video upload for session recordings? Storage implications?

5. **Export Formats:** What data export formats do therapists need? (CSV, PDF, structured JSON?)

---

## Appendix A: Bulgarian Localization Notes

From roadmap research:

### Vocabulary Considerations
- Bulgarian labels are often longer due to suffixation
- Cyrillic characters (ж, ш, щ) are wider than Latin equivalents
- Two-line labels may be needed for longer words

### Cultural Vocabulary
- Bulgarian foods (баница, таратор)
- Bulgarian family terms (баба, дядо)
- Bulgarian social phrases (моля, благодаря)

### Code-Switching Support
Per roadmap: "Bilingual children naturally code-switch - mixing languages within a single utterance."

Example: "I want баница"

The web app should display mixed-language phrases correctly and track code-switching patterns in analytics.

---

## Appendix B: Competitive Landscape

| Feature | Flynn Caregiver Web | Catalyst | Rethink | Central Reach |
|---------|-------------------|----------|---------|---------------|
| Bulgarian language | ✅ | ❌ | ❌ | ❌ |
| AAC integration | ✅ | ❌ | ❌ | ❌ |
| ABA tracking | ✅ | ✅ | ✅ | ✅ |
| OT tracking | ✅ | Partial | ❌ | Partial |
| Primitive reflex | ✅ | ❌ | ❌ | ❌ |
| SLP tracking | ✅ | Partial | ❌ | Partial |
| Caregiver portal | ✅ | Paid add-on | ✅ | ✅ |
| Bilingual support | ✅ | ❌ | ❌ | ❌ |

**Competitive Advantage:** No competitor offers Bulgarian language support OR AAC analytics integration. The combination of both is unique.

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **AAC** | Augmentative and Alternative Communication — tools/strategies to supplement or replace speech |
| **ABA** | Applied Behavior Analysis — evidence-based autism therapy |
| **BCBA** | Board Certified Behavior Analyst — ABA supervisor credential |
| **RBT** | Registered Behavior Technician — ABA direct service provider |
| **DTT** | Discrete Trial Training — structured ABA teaching method |
| **ATNR** | Asymmetrical Tonic Neck Reflex — a primitive reflex |
| **STNR** | Symmetrical Tonic Neck Reflex — a primitive reflex |
| **TLR** | Tonic Labyrinthine Reflex — a primitive reflex |
| **SLP** | Speech-Language Pathologist (Логопед in Bulgarian) |
| **OT** | Occupational Therapist |
| **LAMP** | Language Acquisition through Motor Planning — AAC methodology |
| **Motor Planning** | Consistent physical movements to access vocabulary |

---

*Document prepared for Flynn AAC project. For questions, contact Sean or Galya.*
