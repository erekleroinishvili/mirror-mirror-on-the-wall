import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button'
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmInput {
  title: string,
  prompt: string[],
  cancelLabel: string,
  okLabel: string,
}

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
  ],
  templateUrl: './confirm.component.html',
  styleUrl: './confirm.component.scss'
})
export class ConfirmComponent {
  protected readonly data = inject<ConfirmInput>(MAT_DIALOG_DATA)
}
