export type DeviceMode = 'android' | 'desktop' | 'interactive_board';

export type CharacterGender = 'male' | 'female';

export interface CharacterAppearance {
  skinColor: string;
  hairStyle: string;
  hairColor: string;
  outfit: 'casual' | 'uniform' | 'batik' | 'formal';
  outfitColor: string;
}

export interface PlayerCharacter {
  id: string;
  userId: string;
  name: string;
  gender: CharacterGender;
  appearance: CharacterAppearance;
  x: number;
  y: number;
  currentRoom: string;
  walletBalance: number;
  health: number;
  energy: number;
  jobTitle?: string;
  createdAt: string;
}

export interface PlayerMovementState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  isSprinting: boolean;
  animKey: string;
}

export interface RemotePlayerSyncData extends PlayerMovementState {
  characterId: string;
  characterName: string;
  gender: CharacterGender;
  outfit: string;
}

export interface InteractiveTrigger {
  id: string;
  name: string;
  type: 'building_entrance' | 'shop' | 'npc' | 'interactive_board' | 'seating';
  promptText: string;
  x?: number;
  y?: number;
  data?: Record<string, unknown>;
  action?: () => void;
}

export interface CharacterProfile {
  id: string;
  key: string;
  name: string;
  role: string;
  description: string;
  avatarBg: string;
  tag: string;
}

export const CHARACTER_PROFILES: CharacterProfile[] = [
  {
    id: 'guru_pria',
    key: 'char_teacher',
    name: 'Pak Guru Budi',
    role: 'Guru Pendidik (PID)',
    description: 'Pendidik berwibawa dengan kemeja batik resmi PGRI motif biru emas.',
    avatarBg: 'bg-blue-600',
    tag: 'Guru',
  },
  {
    id: 'guru_wanita',
    key: 'char_guru_wanita',
    name: 'Bu Guru Siti',
    role: 'Guru BK / Konselor',
    description: 'Konselor berhijab ramah berseragam batik toska siap mendampingi siswa.',
    avatarBg: 'bg-teal-600',
    tag: 'Guru',
  },
  {
    id: 'siswa_smp',
    key: 'char_student',
    name: 'Rian Pratama',
    role: 'Siswa Kelas 8 SMP',
    description: 'Pelajar aktif dengan seragam putih-biru lengkap berdasi.',
    avatarBg: 'bg-indigo-600',
    tag: 'Siswa',
  },
  {
    id: 'siswi_hijab',
    key: 'char_siswi_hijab',
    name: 'Aisyah Putri',
    role: 'Siswi Kelas 8 SMP',
    description: 'Pelajar berhijab teladan dengan seragam rok panjang rapi.',
    avatarBg: 'bg-sky-600',
    tag: 'Siswa',
  },
  {
    id: 'satpam',
    key: 'char_satpam',
    name: 'Pak Joko',
    role: 'Keamanan Sekolah',
    description: 'Petugas keamanan berseragam cokelat dan topi pet menjaga ketertiban.',
    avatarBg: 'bg-amber-700',
    tag: 'Staf',
  },
];
