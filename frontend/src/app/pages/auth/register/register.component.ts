import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IAuthService } from '../../../core/interfaces/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(IAuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { name, email, password } = this.registerForm.value;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.successMessage = 'Cadastro realizado com sucesso! Aguarde aprovação do administrador.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.detail || 'Não foi possível criar a conta. Tente novamente.';
      }
    });
  }

  get nameError(): string {
    const control = this.registerForm.get('name');
    if (control?.touched && control.invalid) {
      if (control.errors?.['required']) return 'Nome completo é obrigatório.';
      if (control.errors?.['minlength']) return 'Informe seu nome completo.';
    }
    return '';
  }

  get emailError(): string {
    const control = this.registerForm.get('email');
    if (control?.touched && control.invalid) {
      if (control.errors?.['required']) return 'Email é obrigatório.';
      if (control.errors?.['email']) return 'Email inválido.';
    }
    return '';
  }

  get passwordError(): string {
    const control = this.registerForm.get('password');
    if (control?.touched && control.invalid) {
      if (control.errors?.['required']) return 'Senha é obrigatória.';
      if (control.errors?.['minlength']) return 'A senha deve ter no mínimo 6 caracteres.';
    }
    return '';
  }

  get confirmPasswordError(): string {
    const control = this.registerForm.get('confirmPassword');
    if (control?.touched && control.invalid) return 'Confirme sua senha.';
    if (control?.touched && this.registerForm.hasError('mismatch')) return 'As senhas não coincidem.';
    return '';
  }
}
