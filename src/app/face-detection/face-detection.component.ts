import { AsyncPipe } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { EMPTY, Subject, map, pairwise, throttle, timer } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';
import { ConfirmComponent, ConfirmInput } from '../confirm/confirm.component';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-face-detection',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './face-detection.component.html',
  styleUrls: ['./face-detection.component.scss']
})
export class FaceDetectionComponent implements OnInit {
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)
  private requestId?: number
  protected videoWidth?: number
  protected videoHeight?: number

  #landmarks$ = new Subject<[number, number][] | undefined>()
  protected landmarks$ = this.#landmarks$.pipe(
    pairwise(),
    throttle(([prev, next]) => prev && ! next || ! prev && next ? EMPTY : timer(1000), {leading: false, trailing: true}),
    map(([ , next]) => next)
  )

  protected faceDetected = false
  protected showLandmarks = true
  protected showCoordinates = true
  private model!: blazeface.BlazeFaceModel
  private currentStream!: MediaStream
  protected availableCameras: MediaDeviceInfo[] = [];
  protected selectedCameraId!: string;
  protected cameraReady = false

  async ngOnInit(): Promise<void> {
    this.model = await this.loadModel()
    this.availableCameras = await this.getAvailableCameras()
    if (this.availableCameras.length > 0) {
      this.selectedCameraId = this.availableCameras[0].deviceId;
    }
    await this.setupCamera()
    this.detectFaces()
  }

  private async loadModel() {
    return await blazeface.load()
  }

  private async getAvailableCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'videoinput')
  }

  private async setupCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
    }
    const constraints = {
      video: {
        deviceId: this.selectedCameraId,
        frameRate: { ideal: 5, max: 15 },
        width: 320,
        // height: 240,
      }
    }
    this.currentStream = await navigator.mediaDevices.getUserMedia(constraints)
    this.video.nativeElement.srcObject = this.currentStream
    await this.video.nativeElement.play()
    this.videoWidth = this.video.nativeElement.videoWidth
    this.videoHeight = this.video.nativeElement.videoHeight
    this.cameraReady = true
  }

  protected async switchCamera(cameraId: string) {
    this.cameraReady = false
    const context = this.canvas.nativeElement.getContext('2d')!
    context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height)
    this.requestId === undefined || cancelAnimationFrame(this.requestId)
    // this.video.nativeElement.pause()
    this.selectedCameraId = cameraId;

    await this.setupCamera()
    this.detectFaces()
  }

  protected async nextCamera() {
    const selectedCameraIndex = this.availableCameras.findIndex(camera => camera.deviceId === this.selectedCameraId)
    const nextCameraIndex = (selectedCameraIndex + 1) % this.availableCameras.length
    return this.switchCamera(this.availableCameras[nextCameraIndex].deviceId)
  }

  private async detectFaces() {
    const context = this.canvas.nativeElement.getContext('2d')!;

    const drawFace = (prediction: blazeface.NormalizedFace) => {
      const [startX, startY] = prediction.topLeft as [number, number];
      const [endX, endY] = prediction.bottomRight as [number, number];
      const size = [endX - startX, endY - startY];

      context.beginPath();
      context.rect(startX, startY, size[0], size[1]);
      context.lineWidth = 2;
      context.strokeStyle = 'red';
      context.stroke();

      const landmarksX = prediction.landmarks as [number, number][] | undefined
      if ( ! landmarksX) {
        this.#landmarks$.next(undefined)
      } else {
        this.#landmarks$.next(landmarksX)
        if ( this.showLandmarks ) {
          const mouth = landmarksX[3]
          const eyes = [landmarksX[0], landmarksX[1]]
          const chin = [mouth[0] , endY] as [number, number]
          const forehad = [(eyes[0][0] + eyes[1][0]) /2 , startY] as [number, number]

          const landmarks = [...landmarksX, forehad, chin]
          const connect = (a: [number, number], b: [number, number]) => {
            context.moveTo(a[0], a[1])
            context.lineTo(b[0], b[1])
          }
          context.beginPath()
          connect(landmarks[0], landmarks[1]) // Left eye - Right eye
          connect(landmarks[0], landmarks[2]) // Left eye - Nose
          connect(landmarks[1], landmarks[2]) // Right eye - Nose
          connect(landmarks[2], landmarks[3]) // Noze - Mouth
          connect(landmarks[0], landmarks[4]) // Left eye - Left ear
          connect(landmarks[1], landmarks[5]) // Right eye - Right ear
          connect(landmarks[3], landmarks[4]) // Mouth - Left ear
          connect(landmarks[3], landmarks[5]) // Mouth - Right ear
          connect(landmarks[5], landmarks[6]) // Right ear - chin
          connect(landmarks[4], landmarks[6]) // Left ear - chin
          connect(landmarks[5], landmarks[7]) // Right ear - forehead
          connect(landmarks[4], landmarks[7]) // Left ear - forehead
          context.strokeStyle = 'white'
          context.lineWidth = 1
          context.stroke()

          landmarks.forEach(landmark => {
            context.beginPath();
            context.arc(landmark[0], landmark[1], 5, 0, 2 * Math.PI);
            context.fillStyle = 'white';
            context.strokeStyle = 'white';
            context.lineWidth = 1;
            // context.fill();
            context.stroke();
          });
        }
      }

    }

    const processFrame = async () => {
      const predictions = await this.model.estimateFaces(this.video.nativeElement, false, false)
      context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
      // context.drawImage(this.video.nativeElement, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
      if ( this.cameraReady ) {
        if (predictions.length > 0) {
          this.faceDetected = true
          predictions.forEach(prediction => drawFace(prediction))
        } else {
          this.faceDetected = false
        }
        this.requestId = requestAnimationFrame(processFrame)
      }
    }

    processFrame()
  }

  protected save(rating: number) {
    const done = () => this.router.navigate(['/', 'done'])
    if ( rating < 10) {
      done()
    } else {
      this.confirmPerfect10().subscribe(confirmed => confirmed && done())
    }
  }

  private confirmPerfect10() {
    return this.dialog.open<ConfirmComponent, ConfirmInput, true>(ConfirmComponent, {
      data: {
        title: 'Top of Attractiveness Scale?',
        cancelLabel: 'Cancel',
        okLabel: 'Save',
        prompt: [
          'Level 10 is extremely rare and almost unattainable.',
          'Are you sure?'
        ]
      },
    }).afterClosed()
  }

  console = console

}
