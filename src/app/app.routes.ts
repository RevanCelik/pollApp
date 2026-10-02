import { Routes } from '@angular/router';
import { Home } from './home/home';
import { SurveyDetail } from './survey-detail/survey-detail';
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'surveys/:id', component: SurveyDetail },
];
