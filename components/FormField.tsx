import React from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Input } from './ui/input'
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from './ui/form';


interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'file';
}

const FormField = ({control, placeholder, name, label, type="text"}: FormFieldProps<T>) => {
  return (
    <Controller name={name} control={control} render={({ field }) => (
      (
        <FormItem>
          <FormLabel className='label'>{label}</FormLabel>
          <FormControl>
            <Input className='input' placeholder={placeholder} type={type} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      ))}          
    />
  )
}

export default FormField