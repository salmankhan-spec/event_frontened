import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  Input,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-input.component.html',
  styleUrl: './otp-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true,
    },
  ],
})
export class OtpInputComponent implements ControlValueAccessor, AfterViewInit, OnChanges {
  @Input() length = 6;
  @Input() invalid = false;
  @Input() disabled = false;
  @Input() autocomplete: string | null = 'one-time-code';

  @ViewChildren('otpCell') private otpCells!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = Array.from({ length: 6 }, () => '');

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['length']) {
      const nextLen = Math.max(1, Math.floor(Number(this.length) || 6));
      this.length = nextLen;
      const current = this.value();
      this.digits = Array.from({ length: nextLen }, (_, i) => current[i] || '');
      this.emit();
    }
  }

  ngAfterViewInit(): void {
    // If browser auto-fills OTP, sync it back into the boxes.
    queueMicrotask(() => this.syncFromFocusedValue());
  }

  writeValue(value: string | null): void {
    const v = (value || '').replace(/\D/g, '').slice(0, this.length);
    this.digits = Array.from({ length: this.length }, (_, i) => v[i] || '');
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onFocus(): void {
    this.onTouched();
  }

  onKeyDown(index: number, e: KeyboardEvent): void {
    if (this.disabled) return;

    if (e.key === 'Backspace') {
      if (this.digits[index]) {
        this.digits[index] = '';
        this.emit();
        return;
      }
      if (index > 0) {
        this.digits[index - 1] = '';
        this.emit();
        this.focus(index - 1);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      this.focus(index - 1);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowRight' && index < this.length - 1) {
      this.focus(index + 1);
      e.preventDefault();
      return;
    }
  }

  onPaste(index: number, e: ClipboardEvent): void {
    if (this.disabled) return;
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;
    e.preventDefault();
    this.applyChunk(index, text);
  }

  onInput(index: number, e: Event): void {
    if (this.disabled) return;
    const input = e.target as HTMLInputElement;
    this.applyChunk(index, input.value);
  }

  private applyChunk(startIndex: number, raw: string): void {
    const chunk = (raw || '').replace(/\D/g, '');
    if (!chunk) {
      this.digits[startIndex] = '';
      this.emit();
      return;
    }

    const chars = chunk.split('');
    for (let offset = 0; offset < chars.length; offset++) {
      const i = startIndex + offset;
      if (i >= this.length) break;
      this.digits[i] = chars[offset];
    }

    // Clear trailing values if the user overwrote a single box with a single digit.
    if (chars.length === 1) {
      // Keep other digits intact.
    }

    this.emit();

    const nextIndex = Math.min(this.length - 1, startIndex + chars.length);
    this.focus(nextIndex);
    this.select(nextIndex);
  }

  private emit(): void {
    this.onChange(this.value());
  }

  private value(): string {
    return this.digits.join('').slice(0, this.length);
  }

  private focus(index: number): void {
    const el = this.otpCells?.get(index)?.nativeElement;
    el?.focus();
  }

  private select(index: number): void {
    const el = this.otpCells?.get(index)?.nativeElement;
    el?.select();
  }

  private syncFromFocusedValue(): void {
    const focused = document.activeElement as HTMLInputElement | null;
    if (!focused) return;
    if (!focused.value) return;
    const arr = this.otpCells?.toArray() || [];
    if (!arr.some((r) => r.nativeElement === focused)) return;

    const idx = arr.findIndex((r) => r.nativeElement === focused);
    if (idx < 0) return;
    this.applyChunk(idx, focused.value);
  }
}
