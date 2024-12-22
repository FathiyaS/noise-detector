import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
declare var window: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {
  isListening = false;
  audioContext!: AudioContext;
  analyserNode!: AnalyserNode;
  microphoneStream!: MediaStream;
  dataArray!: Uint8Array;
  chart: any;
  updateInterval: any;
  

  constructor() {}

  ngOnInit() {
    this.initAudio();
  }


  initAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256; // Ukuran FFT untuk mendapatkan data frekuensi
    this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
  }

  initChart() {
    const canvas = document.getElementById('noiseChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(10).fill(''),
          datasets: [{
            label: 'Level Kebisingan',
            data: Array(10).fill(0),
            borderColor: 'rgb(75, 192, 192)',
            fill: false,
            tension: 0.1 // Kekuatan kelengkungan garis, agar lebih smooth
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100 // Skala kebisingan
            }
          }
        }
      });
    } else {
      console.error('Gagal mendapatkan konteks canvas');
    }
  }

  ngAfterViewInit() {
    this.initChart(); // Inisialisasi Chart
    this.startListening(); // Memulai mendengarkan setelah chart terinisialisasi
  }
  
  startListening() {
    if (this.isListening) return;
  
    this.isListening = true;
  
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        this.microphoneStream = stream;
        const microphone = this.audioContext.createMediaStreamSource(stream);
        microphone.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
        
        // Update grafik setelah stream berhasil diinisialisasi
        this.updateGraph(); 
      })
      .catch((err) => {
        console.error('Error accessing microphone:', err);
        alert('Gagal mengakses mikrofon. Pastikan aplikasi memiliki izin akses mikrofon.');
      });
  }

  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    this.microphoneStream.getTracks().forEach(track => track.stop());
    clearInterval(this.updateInterval);
  }

  

  updateGraph() {   
    if (this.chart && this.chart.data) {
      this.updateInterval = setInterval(() => {
        this.analyserNode.getByteFrequencyData(this.dataArray);
        const avgNoiseLevel = this.getAverageNoiseLevel(this.dataArray);
  
        if (avgNoiseLevel > 0) {
          this.chart.data.datasets[0].data.push(avgNoiseLevel);
          this.chart.data.datasets[0].data.shift(); // Hapus data lama agar ukuran tetap konsisten
          this.chart.update();
        }
        

        requestAnimationFrame(() => this.updateGraph());

      }, 10); // Update grafik per ms
    } else {
      console.error('Chart belum terinisialisasi');
    }
  }
  

  getAverageNoiseLevel(data: Uint8Array): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }
}  