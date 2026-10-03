import { Routes } from '@angular/router';
import { Home } from './home/home';
import { SurveyDetail } from './survey-detail/survey-detail';
import { CreateSurvey } from './create-survey/create-survey';
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'surveys/new', component: CreateSurvey },
  { path: 'surveys/:id', component: SurveyDetail },
];
