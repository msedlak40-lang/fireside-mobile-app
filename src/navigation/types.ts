// src/navigation/types.ts
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BibleTab: undefined;
  DevotionsTab: undefined;
  CharactersTab: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
};

export type BibleStackParamList = {
  BibleHome: undefined;
  Chapter: {
    bookId: number;
    bookName: string;
    chapter: number;
  };
  Verse: {
    bookId: number;
    chapter: number;
    verse: number;
  };
};

export type DevotionsStackParamList = {
  DevotionsHome: undefined;
  ThemeList: {
    category: string;
  };
  DevotionDetail: {
    id: number;
  };
};

export type CharactersStackParamList = {
  CharactersHome: undefined;
  CharacterDetail: {
    id: number;
  };
  CharacterLesson: {
    id: number;
  };
};