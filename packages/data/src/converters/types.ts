/**
 * Converts a domain model or Value Object to a database representation and vice versa,
 * inspired by EF Core's ValueConverter.
 */
export interface IValueConverter<TModel, TProvider = unknown> {
  /**
   * Converts a domain value object into a database primitive/format.
   */
  convertToDatabase(value: TModel): TProvider;

  /**
   * Converts a database primitive into a strongly-typed domain value object.
   */
  convertToModel(value: TProvider): TModel;
}
