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
  type: 'building_entrance' | 'shop' | 'npc' | 'interactive_board' | 'seating' | 'lesson' | 'quiz';
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
    id: 'kepala_sekolah',
    key: 'char_farhan',
    name: 'Farhan Sopian Sahid',
    role: 'Kepala Sekolah',
    description: 'Kepala sekolah teladan, memimpin mutu kurikulum dan kemajuan SMP Terpadu Al-Ittihadiyah.',
    avatarBg: 'bg-emerald-600',
    avatarUrl: '/assets/game/characters/avatars/farhan_sopian_sahid.png',
    tag: 'Pimpinan',
  },
  {
    id: 'guru_dafa',
    key: 'char_pak_dafa',
    name: 'Pak Dafa',
    role: 'Guru Informatika',
    description: 'Pendidik teknologi ramah dan inovatif yang membimbing literasi digital serta komputasi siswa.',
    avatarBg: 'bg-violet-600',
    avatarUrl: '/assets/game/characters/avatars/pak_dafa.png',
    tag: 'Guru',
  },
  {
    id: 'guru_septi',
    key: 'char_septi',
    name: 'Bu Septi',
    role: 'Guru B. Indonesia',
    description: 'Guru Bahasa Indonesia yang ramah, santun, dan inspiratif dalam membimbing literasi siswa.',
    avatarBg: 'bg-pink-600',
    avatarUrl: '/assets/game/characters/avatars/septi_nur_aeni.png',
    tag: 'Guru',
  },
  {
    id: 'satpam_asep',
    key: 'char_satpam',
    name: 'Pak Asep',
    role: 'Keamanan Sekolah',
    description: 'Petugas keamanan berseragam cokelat dinas dan topi pet yang sigap menjaga ketertiban sekolah.',
    avatarBg: 'bg-amber-700',
    avatarUrl: '/assets/game/characters/avatars/pak_joko.png',
    tag: 'Staf',
  },
  {
    id: 'siswa_sonaji',
    key: 'char_student',
    name: 'Sonaji',
    role: 'Siswa Kelas 9B',
    description: 'Siswa Kelas 9B SMP Terpadu Al-Ittihadiyah yang aktif, sopan, dan bersemangat dalam pembelajaran.',
    avatarBg: 'bg-indigo-600',
    avatarUrl: '/assets/game/characters/avatars/rian_pratama.png',
    tag: 'Kelas 9B',
  },
  {
    id: 'siswi_ajeng',
    key: 'char_siswi_hijab',
    name: 'Ajeng',
    role: 'Siswi Kelas 9A',
    description: 'Siswi berhijab teladan Kelas 9A SMP Terpadu Al-Ittihadiyah yang tekun dan gemar membaca di perpustakaan.',
    avatarBg: 'bg-sky-600',
    avatarUrl: '/assets/game/characters/avatars/aisyah_putri.png',
    tag: 'Kelas 9A',
  },
  {
    id: 'operator_qodi',
    key: 'char_pa_qodi',
    name: 'Pa Qodi',
    role: 'Operator Sekolah',
    description: 'Operator sekolah yang mengelola administrasi data pokok pendidikan, raport digital, dan sistem smart school.',
    avatarBg: 'bg-cyan-700',
    avatarUrl: '/assets/game/characters/avatars/pa_qodi.png',
    tag: 'Staf',
  },
  {
    id: 'guru_fitri',
    key: 'char_bu_fitri',
    name: 'Bu Fitri',
    role: 'Guru Matematika',
    description: 'Pendidik matematika berdedikasi yang membimbing penalaran logika dan penguasaan konsep numerasi siswa.',
    avatarBg: 'bg-teal-600',
    avatarUrl: '/assets/game/characters/avatars/bu_fitri.png',
    tag: 'Guru',
  },
];
