import { Type } from '@mikro-orm/core';
import type { IValueConverter } from '@tsnx/data';

export type ValueConverterTypeConstructor<TModel, TProvider = string> = new () => Type<
  TModel,
  TProvider
>;

/**
 * Creates a MikroORM custom Type class from a TSNX IValueConverter,
 * enabling transparent mapping between domain Value Objects and database primitives.
 */
export function createValueConverterType<TModel, TProvider = string>(
  typeName: string,
  converter: IValueConverter<TModel, TProvider>,
  columnType = 'text',
): ValueConverterTypeConstructor<TModel, TProvider> {
  class ConvertedType extends Type<TModel, TProvider> {
    override convertToDatabaseValue(value: TModel): TProvider {
      if (value === null || value === undefined) return value as any;
      return converter.convertToDatabase(value);
    }

    override convertToJSValue(value: TProvider): TModel {
      if (value === null || value === undefined) return value as any;
      return converter.convertToModel(value);
    }

    override getColumnType(): string {
      return columnType;
    }
  }

  Object.defineProperty(ConvertedType, 'name', { value: typeName });
  return ConvertedType;
}
