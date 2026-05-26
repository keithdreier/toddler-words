export type WordCard = {
  id: string;
  text: string;
  categories: string[];
  favorite: boolean;
  speechText?: string;
};

export type WordLibrary = {
  categories: string[];
  words: WordCard[];
};
