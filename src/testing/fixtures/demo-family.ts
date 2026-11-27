/**
 * FICTIONAL demo family for the prototype. No real people, no real health data.
 * Dates are relative to "today" so the demo always looks current.
 */
import { addDays, LocalDate } from '@/domain/dates/local-date';
import { localTime } from '@/domain/dates/zoned-date-time';
import type {
  Appointment,
  Child,
  Family,
  FamilyInvitation,
  FamilyMembership,
  GrowthMeasurement,
  MediaAsset,
  Memory,
  Pregnancy,
  User,
  UserPreference,
} from '@/domain/model';

export const FIXTURE_IMAGES: Record<string, number> = {
  sunrise: require('../../../assets/fixtures/sunrise.jpg'),
  leaves: require('../../../assets/fixtures/leaves.jpg'),
  sea: require('../../../assets/fixtures/sea.jpg'),
  blanket: require('../../../assets/fixtures/blanket.jpg'),
  lavender: require('../../../assets/fixtures/lavender.jpg'),
  window: require('../../../assets/fixtures/window.jpg'),
};

export interface DemoDatabase {
  users: User[];
  families: Family[];
  memberships: FamilyMembership[];
  invitations: FamilyInvitation[];
  pregnancies: Pregnancy[];
  children: Child[];
  memories: Memory[];
  media: MediaAsset[];
  measurements: GrowthMeasurement[];
  appointments: Appointment[];
  preferences: UserPreference[];
  /** finalize() idempotency keys -> memory id */
  requestKeys: Record<string, string>;
}

export const DEMO_USER_ID = 'u-elif';
export const DEMO_FAMILY_ID = 'fam-yildiz';

export function emptyDatabase(): DemoDatabase {
  return { users: [], families: [], memberships: [], invitations: [], pregnancies: [], children: [], memories: [], media: [], measurements: [], appointments: [], preferences: [], requestKeys: {} };
}

export function buildDemoDatabase(today: LocalDate, nowIso: string): DemoDatabase {
  const d = (offset: number) => addDays(today, offset);
  const ts = nowIso;
  const F = DEMO_FAMILY_ID;

  const users: User[] = [
    { id: 'u-elif', displayName: 'Elif' },
    { id: 'u-can', displayName: 'Can' },
    { id: 'u-nermin', displayName: 'Nermin' },
  ];
  const memberships: FamilyMembership[] = [
    { id: 'm-elif', familyId: F, userId: 'u-elif', role: 'owner', relationshipLabel: 'Anne', status: 'active', joinedAt: ts, revokedAt: null },
    { id: 'm-can', familyId: F, userId: 'u-can', role: 'adult', relationshipLabel: 'Baba', status: 'active', joinedAt: ts, revokedAt: null },
    { id: 'm-nermin', familyId: F, userId: 'u-nermin', role: 'adult', relationshipLabel: 'Babaanne', status: 'active', joinedAt: ts, revokedAt: null },
  ];

  const oldPregnancy: Pregnancy = {
    id: 'preg-deniz',
    familyId: F,
    nickname: 'Minik Bezelye',
    clinicianDueDate: d(-815),
    lastMenstrualPeriod: null,
    status: 'born',
    remindersPaused: false,
    contentHidden: false,
    createdBy: 'u-elif',
    createdAt: ts,
    updatedAt: ts,
  };
  const activePregnancy: Pregnancy = {
    id: 'preg-fistik',
    familyId: F,
    nickname: 'Fıstık',
    clinicianDueDate: null,
    lastMenstrualPeriod: d(-(24 * 7 + 3)),
    status: 'active',
    remindersPaused: false,
    contentHidden: false,
    createdBy: 'u-elif',
    createdAt: ts,
    updatedAt: ts,
  };
  const deniz: Child = {
    id: 'child-deniz',
    familyId: F,
    name: 'Deniz',
    birthDate: d(-820),
    birthTime: localTime('04:42'),
    originPregnancyId: 'preg-deniz',
    avatarMediaId: 'media-window',
    createdBy: 'u-elif',
    createdAt: ts,
    updatedAt: ts,
  };

  const media: MediaAsset[] = Object.keys(FIXTURE_IMAGES).map((key) => ({
    id: `media-${key}`,
    familyId: F,
    storageKey: `fixture:${key}`,
    mimeType: 'image/jpeg',
    width: 900,
    height: 900,
    byteSize: 40_000,
    status: 'ready',
    uploadedBy: 'u-elif',
    createdAt: ts,
  }));

  const mem = (id: string, partial: Omit<Memory, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>): Memory => ({ id, familyId: F, createdAt: ts, updatedAt: ts, ...partial });
  const memories: Memory[] = [
    mem('mem-1', { subject: { kind: 'pregnancy', pregnancyId: 'preg-deniz' }, title: 'İlk ultrason çıktısı', body: 'Buzdolabının kapağına astık. Can her sabah önünde durup gülümsüyor.', eventDate: d(-1010), mediaIds: [], visibility: 'family', authorId: 'u-elif' }),
    mem('mem-2', { subject: { kind: 'pregnancy', pregnancyId: 'preg-deniz' }, title: 'Odanın rengi', body: 'Uzun tartışmalardan sonra yumuşak bir yeşilde karar kıldık.', eventDate: d(-900), mediaIds: ['media-leaves'], visibility: 'family', authorId: 'u-can' }),
    mem('mem-3', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Eve ilk gün', body: 'Pencerenin önündeki ışık tam yüzüne düşüyordu.', eventDate: d(-817), mediaIds: ['media-window', 'media-blanket'], visibility: 'family', authorId: 'u-elif' }),
    mem('mem-4', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Deniz denizi gördü', body: 'Dalgaların sesine kahkahayla karşılık verdi. Babaannesi bütün gün bunu anlattı.', eventDate: d(-430), mediaIds: ['media-sea'], visibility: 'family', authorId: 'u-nermin' }),
    mem('mem-5', { subject: { kind: 'child', childId: 'child-deniz' }, title: null, body: '“Ba-ba” dedi. Elif buna itiraz ediyor ama ikimiz de duyduk.', eventDate: d(-560), mediaIds: [], visibility: 'family', authorId: 'u-can' }),
    mem('mem-6', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Kendime not', body: 'Bugün çok yorgundum ama akşam birlikte uyuyakaldık. Bunu unutmak istemiyorum.', eventDate: d(-300), mediaIds: [], visibility: 'private', authorId: 'u-elif' }),
    mem('mem-7', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Can’ın özel notu', body: 'Yalnızca Can görebilir. Prototipte bu anı Elif’e görünmez.', eventDate: d(-200), mediaIds: [], visibility: 'private', authorId: 'u-can' }),
    mem('mem-8', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Lavanta tarlası', body: 'İlk kez bu kadar uzun yürüdü.', eventDate: d(-40), mediaIds: ['media-lavender'], visibility: 'family', authorId: 'u-elif' }),
    mem('mem-9', { subject: { kind: 'pregnancy', pregnancyId: 'preg-fistik' }, title: 'Deniz abla olacak', body: 'Haberi verdiğimizde önce şaşırdı, sonra karnıma bir öpücük kondurdu.', eventDate: d(-60), mediaIds: ['media-sunrise'], visibility: 'family', authorId: 'u-elif' }),
    mem('mem-10', { subject: { kind: 'pregnancy', pregnancyId: 'preg-fistik' }, title: 'İlk tekme hissi', body: 'Akşam yemeğinden sonra, kanepede. Can elini tam zamanında koyamadı.', eventDate: d(-4), mediaIds: [], visibility: 'family', authorId: 'u-elif' }),
  ];

  const meas = (id: string, kind: GrowthMeasurement['kind'], value: number, unit: string, offset: number, birth = false): GrowthMeasurement => ({
    id,
    familyId: F,
    childId: 'child-deniz',
    kind,
    canonicalValue: value,
    enteredUnit: unit,
    measuredOn: d(offset),
    isBirthMeasurement: birth,
    authorId: 'u-elif',
    createdAt: ts,
  });
  const measurements: GrowthMeasurement[] = [
    meas('ms-w0', 'weight', 3310, 'kg', -820, true),
    meas('ms-l0', 'length', 500, 'cm', -820, true),
    meas('ms-h0', 'head-circumference', 345, 'cm', -820, true),
    meas('ms-w1', 'weight', 4600, 'kg', -780),
    meas('ms-w2', 'weight', 6400, 'kg', -700),
    meas('ms-w3', 'weight', 7900, 'kg', -600),
    meas('ms-w4', 'weight', 9100, 'kg', -450),
    meas('ms-w5', 'weight', 10300, 'kg', -300),
    meas('ms-w6', 'weight', 11800, 'kg', -60),
    meas('ms-l1', 'length', 610, 'cm', -700),
    meas('ms-l2', 'length', 720, 'cm', -500),
    meas('ms-l3', 'length', 830, 'cm', -300),
    meas('ms-l4', 'length', 880, 'cm', -60),
  ];

  const appt = (id: string, partial: Omit<Appointment, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>): Appointment => ({ id, familyId: F, createdAt: ts, updatedAt: ts, ...partial });
  const appointments: Appointment[] = [
    appt('ap-1', { subject: { kind: 'pregnancy', pregnancyId: 'preg-fistik' }, title: 'Rutin kontrol', start: { date: d(5), time: localTime('10:30'), timeZone: 'Europe/Istanbul' }, location: 'Kurgusal Aile Sağlığı Merkezi, Moda', notes: 'Sorular listesini yanına al.', visibility: 'family', authorId: 'u-elif' }),
    appt('ap-2', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Diş hekimi', start: { date: d(12), time: localTime('15:00'), timeZone: 'Europe/Istanbul' }, location: 'Örnek Ağız ve Diş Kliniği', notes: null, visibility: 'family', authorId: 'u-can' }),
    appt('ap-3', { subject: { kind: 'child', childId: 'child-deniz' }, title: 'Çocuk doktoru kontrolü', start: { date: d(-30), time: localTime('09:00'), timeZone: 'Europe/Istanbul' }, location: null, notes: null, visibility: 'family', authorId: 'u-elif' }),
  ];

  const invitations: FamilyInvitation[] = [
    { id: 'inv-1', familyId: F, invitedBy: 'u-elif', role: 'adult', relationshipLabel: 'Bakıcı', code: 'MINIK-4821', expiresAt: new Date(Date.parse(ts) + 36 * 3600_000).toISOString(), status: 'pending', createdAt: ts },
  ];

  return {
    users,
    families: [{ id: F, name: 'Yıldız ailesi', createdBy: 'u-elif', createdAt: ts }],
    memberships,
    invitations,
    pregnancies: [oldPregnancy, activePregnancy],
    children: [deniz],
    memories,
    media,
    measurements,
    appointments,
    preferences: [
      {
        userId: 'u-elif',
        selectedProfile: { kind: 'pregnancy', pregnancyId: 'preg-fistik' },
        locale: 'tr',
        measurementSystem: 'metric',
        notifications: { appointmentReminders: true, weeklyPregnancyUpdate: true },
      },
    ],
    requestKeys: {},
  };
}
