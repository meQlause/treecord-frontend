import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field, FieldError } from '../../../../src/shared/ui/Field';

describe('Field', () => {
  it('labels its control and shows the hint', () => {
    render(
      <Field label="Name" hint="As on your ID">
        <input />
      </Field>,
    );

    expect(screen.getByRole('textbox')).toHaveAccessibleName(/Name/);
    expect(screen.getByText('As on your ID')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('with an error: alerts, marks the control invalid and links it by aria-describedby; the value stays', () => {
    render(
      <Field label="Amount" error="Use a positive amount">
        <input defaultValue="-4" />
      </Field>,
    );

    const input = screen.getByRole('textbox');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Use a positive amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(input).toHaveValue('-4');
  });

  it('treats an empty error as no error', () => {
    render(
      <Field label="Amount" error="">
        <input />
      </Field>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });
});

describe('FieldError', () => {
  it('is an alert with the given id', () => {
    render(<FieldError id="err">Bad</FieldError>);

    expect(screen.getByRole('alert')).toHaveAttribute('id', 'err');
  });
});
