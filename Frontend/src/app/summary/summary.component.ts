import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit {
  chart: any;
  chartDescription = '';

  constructor(private http: HttpClient) {
    Chart.register(...registerables); // Register all Chart.js components
  }

  ngOnInit(): void {
    this.http.get('http://localhost:3000/api/summary-chart').subscribe(
      (data: any) => {
        this.createChart(data);
        this.chartDescription = data.description;
      },
      (error) => {
        console.error('Error fetching summary chart data', error);
      }
    );
  }

  createChart(data: any): void {
    if (this.chart) {
      this.chart.destroy(); // Destroy previous chart if exists
    }
    
    this.chart = new Chart('summaryChart', {
      type: 'bar', // Now properly registered
      data: data.data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: data.title
          }
        }
      }
    });
  }
}