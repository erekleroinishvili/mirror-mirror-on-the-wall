import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FaceDetectionComponent } from './face-detection/face-detection.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FaceDetectionComponent,
    RouterOutlet,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent { }
