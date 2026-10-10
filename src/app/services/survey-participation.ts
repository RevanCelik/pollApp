import { Injectable } from '@angular/core';

/** Remembers successful participation per survey in this browser. */
@Injectable({ providedIn: 'root' })
export class SurveyParticipation {
  private readonly completed = new Set<string>();
  private readonly prefix = 'poll-app:submitted:';

  hasSubmitted(id: string): boolean {
    if (this.completed.has(id)) return true;
    try {
      return localStorage.getItem(this.prefix + id) === '1';
    } catch {
      return false;
    }
  }

  markSubmitted(id: string): void {
    this.completed.add(id);
    try {
      localStorage.setItem(this.prefix + id, '1');
    } catch {
      // Keep the session locked even when browser storage is unavailable.
    }
  }
}
