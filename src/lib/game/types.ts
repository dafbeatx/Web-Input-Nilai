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
  avatarUrl: string;
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
    avatarUrl: '/assets/game/characters/avatars/pak_guru_budi.png',
    tag: 'Guru',
  },
  {
    id: 'guru_wanita',
    key: 'char_guru_wanita',
    name: 'Bu Guru Siti',
    role: 'Guru BK / Konselor',
    description: 'Konselor berhijab ramah berseragam batik toska siap mendampingi siswa.',
    avatarBg: 'bg-teal-600',
    avatarUrl: '/assets/game/characters/avatars/bu_guru_siti.png',
    tag: 'Guru',
  },
  {
    id: 'siswa_smp',
    key: 'char_student',
    name: 'Rian Pratama',
    role: 'Siswa Kelas 8 SMP',
    description: 'Pelajar aktif dengan seragam putih-biru lengkap berdasi dan tas ransel.',
    avatarBg: 'bg-indigo-600',
    avatarUrl: '/assets/game/characters/avatars/rian_pratama.png',
    tag: 'Siswa',
  },
  {
    id: 'siswi_hijab',
    key: 'char_siswi_hijab',
    name: 'Aisyah Putri',
    role: 'Siswi Kelas 8 SMP',
    description: 'Pelajar berhijab teladan dengan seragam rapi dan tas ransel.',
    avatarBg: 'bg-sky-600',
    avatarUrl: '/assets/game/characters/avatars/aisyah_putri.png',
    tag: 'Siswa',
  },
  {
    id: 'satpam',
    key: 'char_satpam',
    name: 'Pak Joko',
    role: 'Keamanan Sekolah',
    description: 'Petugas keamanan berseragam cokelat dan topi pet menjaga ketertiban.',
    avatarBg: 'bg-amber-700',
    avatarUrl: '/assets/game/characters/avatars/pak_joko.png',
    tag: 'Staf',
  },
  {
    id: 'kepala_sekolah',
    key: 'char_farhan',
    name: 'Farhan Sopian Sahid',
    role: 'Kepala Sekolah',
    description: 'Kepala sekolah teladan, memimpin mutu kurikulum dan kemajuan SMP Terpadu.',
    avatarBg: 'bg-emerald-600',
    avatarUrl: '/assets/game/characters/avatars/farhan_sopian_sahid.png',
    tag: 'Pimpinan',
  },
  {
    id: 'guru_dafa',
    key: 'char_pak_dafa',
    name: 'Pak Dafa',
    role: 'Guru IT & Multimedia',
    description: 'Pendidik teknologi ramah dan inovatif yang membimbing literasi digital siswa.',
    avatarBg: 'bg-violet-600',
    avatarUrl: '/assets/game/characters/avatars/pak_dafa.png',
    tag: 'Guru',
  },
  {
    id: 'staf_septi',
    key: 'char_septi',
    name: 'Septi Nur Aeni',
    role: 'Staf Tata Usaha',
    description: 'Staf administrasi dan pendidik berhijab anggun yang sigap mengelola layanan sekolah.',
    avatarBg: 'bg-pink-600',
    avatarUrl: '/assets/game/characters/avatars/septi_nur_aeni.png',
    tag: 'Staf',
  },
];
