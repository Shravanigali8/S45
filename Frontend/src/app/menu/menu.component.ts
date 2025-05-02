import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'pb-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {

  constructor(private router: Router) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token'); // returns true if token exists
  }
  
  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

}
