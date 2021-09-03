import {AnyModel} from '../model';
import {ResourceMap} from './map';
import {OneReadDocument, PartialResourceQuery} from '../framework';
import {AnyIResource} from '../schema';

/** A concise map of relationships to include.
 *
 * This is typed specifically so that the include builder can reasonably check
 * types on the provided arguments.
 */
export type Include<TIResource extends AnyIResource> = {
  [K in keyof TIResource['relationships'] & string]: Array<string> | null;
};

/** Convert a map of relationships to a list of paths.
 *
 * Each value in the argument map should already be an array of strings or
 * null. If a value is null, we've already pushed the parent key as an entry.
 * If it's an array, also include each child, concatenated.
 *
 * include({
 *  name: null,
 *  friends: include({
 *    name: null
 *  }),
 * })
 *
 * will become
 *
 * include({
 *   name: null,
 *   friends: ["name"]
 * })
 *
 * will become
 *
 * ["name", "friends", "friends.name"]
 *
 * @param map
 */
export function include<TIResource extends AnyIResource>(map: Include<TIResource>): Array<string> {
  const result = [];
  for (const entry of Object.entries(map)) {
    result.push(entry[0]);
    if (entry[1] !== null) {
      for (const child of entry[1] as Array<string>) {
        result.push(`${entry[0]}.${child}`);
      }
    }
  }
  return result;
}

export interface RelaterBuilder<TIReadResource extends AnyIResource, TModel extends AnyModel<TIReadResource['type']>> {
  readonly schema: Include<TIReadResource>;
  relate(model: TModel, map: ResourceMap): void;
}

type Relate<TModel extends AnyModel> = (model: TModel, map: ResourceMap) => TModel;
type Map<TModel extends AnyModel> = (document: OneReadDocument<TModel>, model?: TModel) => TModel;

export interface Relater<TModel extends AnyModel> {
  readonly include: Array<string>;
  readonly relate: Relate<TModel>;
  readonly map: Map<TModel>;
  readonly query: () => PartialResourceQuery<TModel['type']>;
}

export function relater<TIReadResource extends AnyIResource, TModel extends AnyModel<TIReadResource['type']>>(
  builder: RelaterBuilder<TIReadResource, TModel>,
): Relater<TModel> {
  const i = include(builder.schema);
  return {
    include: i,
    relate: (model: TModel, map: ResourceMap) => {
      builder.relate(model, map);
      return model;
    },
    map: (document: OneReadDocument<TModel>, model?: TModel) => {
      model = model ?? document.data!;
      const map = new ResourceMap().putAll(document.included);
      builder.relate(model, map);
      return model;
    },
    query: () => {
      return new PartialResourceQuery().include(...i);
    },
  };
}
