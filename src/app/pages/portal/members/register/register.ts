import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, readonly } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { MemberService } from '../service/member-service';
import { MemberPayload } from '@interfaces/member.interface';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';

interface RegisterData {
  fullName: string;
  phoneNumber: string;
  location: string | null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormField,
    Inputfield,
    Dropdown
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Register {
  private readonly memberService = inject(MemberService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  protected readonly isSubmitting = signal(false);
  protected readonly dropdownItems = <{ label: string; value: string }[]>([
    { label: "Tanoso", value: "tanoso" },
    { label: "Apatrapa", value: "apatrapa" },
    { label: "Bokanky", value: "bokankye" },
    { label: "Nyenkyerenyase", value: "nyenkyerenyase" },
    { label: "Bokankye Sene", value: "bokankye sene" },
    { label: "Amakom", value: "amakom" },
    { label: "Asafo", value: "asafo" },
  ]);

  private INITIAL_DATA = <RegisterData>({
    fullName: '',
    phoneNumber: '',
    location: null
  });

  protected readonly registerModel = signal<RegisterData>(this.INITIAL_DATA);

  protected readonly registerForm = form(this.registerModel, (path) => {
    required(path.fullName, {
      message: 'Fullname is required.'
    });

    required(path.phoneNumber, {
      message: 'Phone number is required.'
    });

    required(path.location, {
      message: 'Location is required.'
    });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (this.registerForm().invalid() || this.isSubmitting()) {
      if (this.registerForm().invalid()) {
        this.toastService.error({ message: 'Please complete all required fields.' });
      }
      return;
    }

    let creatorId: string;
    try {
      const activeUser = await this.authService.getActiveUser();
      creatorId = activeUser.id;
    } catch (error) {
      await this.authService.handleAuthError(error, this.toastService, {
        expired: 'Your session has expired. Please log in again.',
      });
      return;
    }

    const payload = this.registerForm().value();
    const memberPayload: MemberPayload = {
      fullname: payload.fullName.trim(),
      telephoneNumber: payload.phoneNumber.trim(),
      location: (payload.location ?? '').trim(),
      creatorId,
    };

    this.isSubmitting.set(true);
    try {
      await this.memberService.addMember(memberPayload);
      this.toastService.success({ message: 'Member registered successfully.' });
      this.registerForm().reset({ ...this.INITIAL_DATA });
    } catch (error) {
      this.toastService.error({ message: 'Unable to register member. Please try again.' });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}