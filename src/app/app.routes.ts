import { Routes } from '@angular/router';
import { FaceDetectionComponent } from './face-detection/face-detection.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { DoneComponent } from './done/done.component';

export const routes: Routes = [
    {
        path: 'start',
        component: WelcomeComponent,
    },
    {
        path: 'face',
        component: FaceDetectionComponent,
    },
    {
        path: 'done',
        component: DoneComponent,
    },
    {
        path: '**',
        redirectTo: 'start'
    }
]
