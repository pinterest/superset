import { Dashboard } from 'src/views/CRUD/types';

export enum HomepageTab {
  Top = 'Top',
  Recommended = 'Recommended',
  Favorites = 'Favorites',
  Mine = 'Mine',
}

export type TopSectionInfo = {
  name: string;
  dashboards: Dashboard[];
};

export type TopSectionConfig = {
  name: string;
  tag: string;
};
