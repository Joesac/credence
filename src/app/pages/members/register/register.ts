import { Component, signal } from '@angular/core';
import { form, FormField, required, readonly } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Dropdown } from '@shared/components/dropdown/dropdown';

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
  protected readonly dropdownItems = <{label: string; value: string}[]>([
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

    readonly(path.location);
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.registerForm().invalid()) return;
    console.log('Register payload', this.registerForm().value());
    this.registerForm().reset({ ...this.INITIAL_DATA });
  }
}