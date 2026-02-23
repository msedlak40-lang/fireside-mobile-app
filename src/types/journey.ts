export interface JourneyLocation {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  order: number;
  narrative: string;
  scriptures: Array<{
    reference: string;
    text: string;
  }>;
  details: string[];
  faithLesson: string;
}

export interface JourneyStoryCard {
  id: string;
  title: string;
  icon: string;
  theme: string;
  narrative: string;
  scripture: {
    reference: string;
    text: string;
  };
  whySection: string;
  jesusConnection: string;
  modernApplication: string;
}

export interface JourneyCharacteristic {
  trait: string;
  description: string;
}

export interface JourneyCharacter {
  id: string;
  name: string;
  title: string;
  role: string;
  avatar: string;
  background: string;
  scripture: {
    reference: string;
    text: string;
  };
  journey: string;
  characteristics: JourneyCharacteristic[];
  faithLesson: string;
  reflection: string;
}

export interface Journey {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  themes: string[];
  locations: JourneyLocation[];
  storyCards: JourneyStoryCard[];
  characters: JourneyCharacter[];
  generatedAt?: string;
  generatedBy?: string;
}

export interface UserJourneyProgress {
  id: string;
  user_id: string;
  journey_id: string;
  current_location: number;
  completed_locations: number[];
  started_at: string;
  last_viewed_at: string;
  completed_at: string | null;
}
