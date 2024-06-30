import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-done',
  standalone: true,
  imports: [
    RouterLink,
  ],
  templateUrl: './done.component.html',
  styleUrl: './done.component.scss'
})
export class DoneComponent {

}
