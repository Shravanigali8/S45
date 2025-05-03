import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  chart: any;
  chartDescription = '';

  constructor(private http: HttpClient) {
    Chart.register(...registerables); // Register all Chart.js components
  }

  ngOnInit(): void {
    this.http.get('https://s45.onrender.com/api/reports-chart').subscribe(
      (data: any) => {
        this.createChart(data);
        this.chartDescription = data.description;
      },
      (error) => {
        console.error('Error fetching reports chart data', error);
      }
    );
  }

  createChart(data: any): void {
    if (this.chart) {
      this.chart.destroy(); // Destroy previous chart if exists
    }
    
    this.chart = new Chart('reportsChart', {
      type: 'line', // Now properly registered
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