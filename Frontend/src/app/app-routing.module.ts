import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomepageComponent } from './homepage/homepage.component';
import { P404Component } from './p404/p404.component';
import { SummaryComponent } from './summary/summary.component';
import { ReportsComponent } from './reports/reports.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  {
    path: '',
    component: HomepageComponent,
    pathMatch: 'full'  // Sets the homepage as the default route
  },
  
  {
    path: 'dashboard',
    component: DashboardComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard] // Protecting the dashboard route with AuthGuard
  },

  {
    path: 'summary',
    component: SummaryComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard]
  },

  {
    path: 'reports',
    component: ReportsComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard] // Optional: Guard can be applied here as well
  },

  {
    path: '**',  // Catch-all for undefined routes
    component: P404Component  // Displays a 404 page for invalid routes
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],  // Register routes with Angular's router
  exports: [RouterModule]  // Export RouterModule to make routes available in the app
})
export class AppRoutingModule {}
