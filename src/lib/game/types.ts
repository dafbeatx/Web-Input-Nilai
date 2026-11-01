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
