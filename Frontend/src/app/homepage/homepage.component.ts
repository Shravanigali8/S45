import { Component } from '@angular/core';
import axios from 'axios';
import { Router } from '@angular/router'; // Import Router

@Component({
  selector: 'pb-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent {
  // Registration form fields
  user = '';
  pass = '';
  confirmPass = '';
  registrationErrors: any = {};
  
  // Login form fields
  loginUser = '';
  loginPass = '';
  loginErrors: any = {};

  registrationResponseMessage = '';
  loginResponseMessage = '';

  constructor(private router: Router) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token'); // Check if a token exists
  }

  // Registration form validation
  validateRegistrationForm() {
    const errors: any = {};

    if (!this.user.trim()) {
      errors.user = 'Username is required';
    }
    if (!this.pass.trim()) {
      errors.pass = 'Password is required';
    }
    if (this.pass !== this.confirmPass) {
      errors.confirmPass = 'Passwords must match';
    }

    this.registrationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // Login form validation
  validateLoginForm() {
    const errors: any = {};

    if (!this.loginUser.trim()) {
      errors.username = 'Username is required';
    }
    if (!this.loginPass.trim()) {
      errors.password = 'Password is required';
    }

    this.loginErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // Handle registration form submission
  async onSubmit(event: Event) {
    event.preventDefault();
    if (this.validateRegistrationForm()) {
      try {
        const serverResponse = await axios.post('http://localhost/api/register', {
          username: this.user,
          password: this.pass,
        });

        console.log('Registration successful!', serverResponse.data);
        this.registrationResponseMessage = 'Account created successfully!';
        this.user = '';
        this.pass = '';
        this.confirmPass = '';
        this.registrationErrors = {}; // Clear registration errors after successful submission
      } catch (error: any) {
        console.log(error)
        if (error.response && error.response.data.error.includes('Duplicate')) {
          this.registrationResponseMessage = 'Registration failed. Please check the form.';
          this.registrationErrors.server = error.response.data.error || 'Server error';
        } else {
          this.registrationResponseMessage = 'Registration failed. Please check the form.';
          this.registrationErrors.server = error.response.data.error || 'Server error';
        }
      }
    } else {
      this.registrationResponseMessage = 'Please fix the errors and try again.';
    }
  }

  // Handle login form submission
  async handleLogin(event: Event) {
    event.preventDefault();
    if (this.validateLoginForm()) {
      try {
        const response = await axios.post('http://localhost/api/login', {
          username: this.loginUser,
          password: this.loginPass
        });

        console.log('Login successful!', response.data);
        localStorage.setItem('token', response.data.token); // Save token in localStorage
        this.loginResponseMessage = 'Login successful!';
        this.router.navigate(['/dashboard']);
        
        // Clear login form after successful login
        this.loginUser = '';
        this.loginPass = '';
        this.loginErrors = {}; // Clear login errors after successful submission
      } catch (error: any) {
        this.loginResponseMessage = 'Login failed. Please check your credentials.';
        this.loginErrors.server = error.response?.data.error || 'Server error';
      }
    } else {
      this.loginResponseMessage = 'Please fill in all required fields.';
    }
  }
}
