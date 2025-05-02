import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    
    // Check if the user has a token in localStorage
    if (localStorage.getItem('token')) {
      return true;
    } else {
      // Show alert if not logged in
      alert('You need to log in to access this page.');

      // If no token, redirect to login
      this.router.navigate(['/']);
      return false;
    }
  }
}
