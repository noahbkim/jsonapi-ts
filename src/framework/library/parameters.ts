/** A convenience wrapper for a map.
 *
 * This class wraps up the functionality of a map in a subset of
 * methods. It deals exclusively with string keys and values.
 */
export class ParameterWrapper {
  public readonly parameters: Map<string, string>;

  /** Initialize a new parameter wrapper.
   *
   * @param parameters an existing map to start from.
   */
  public constructor(parameters?: Map<string, string>) {
    this.parameters = parameters || new Map();
  }

  /** Set a value on the map to a string.
   *
   * @param field the key to set.
   * @param value the value to associate with the key.
   */
  public set(field: string, value: string): this {
    this.parameters.set(field, value);
    return this;
  }

  /** Generate a third map based on the combination of two maps.
   *
   * Overwrites any duplicate keys with the value in other rather than
   * the value in this. Does not mutate either input.
   *
   * @param other the parameter map to combine with.
   */
  public with(other: ParameterWrapper): ParameterWrapper {
    const result = new ParameterWrapper();
    this.parameters.forEach((value, key) => result.set(key, value));
    other.parameters.forEach((value, key) => result.set(key, value));
    return result;
  }
}
