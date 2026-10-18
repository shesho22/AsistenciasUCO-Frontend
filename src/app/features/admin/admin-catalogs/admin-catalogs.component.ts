import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-catalogs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 text-center text-warm-600">
      <p>Redirigiendo a la gestión de facultades...</p>
    </div>
  `,
})
export class AdminCatalogsComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/app/admin/facultades'], { replaceUrl: true });
  }
}
