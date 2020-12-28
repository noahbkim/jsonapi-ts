import {Model, ManyRelationship, IReadResourceFromModel, AnyModel} from '../src/model';
import {IAttributes, IRelationship, IRelationships, IResource} from '../src/schema';

type ResourceType = 'users';

export interface IWriteUserAttributes extends IAttributes {
  email: string;
  firstName: string;
  lastName: string;
}

export interface IWriteUserRelationships extends IRelationships {
  friends: IRelationship<Array<any>>;
}

export type IWriteUser = IResource<ResourceType, IWriteUserAttributes, IWriteUserRelationships>;

export interface IReadUserAttributes extends IWriteUserAttributes, IAttributes {
  timeCreated: string;
}

export type IReadUser = IResource<ResourceType, IReadUserAttributes, IWriteUserRelationships>;

export class User extends Model<ResourceType, IReadUser, IWriteUser> {
  public static type: ResourceType = 'users';
  public type: ResourceType = User.type;

  public email: string;
  public firstName: string;
  public lastName: string;
  public friends: ManyRelationship<User>;
  public timeCreated: Date | null;

  public constructor(email: string, firstName: string, lastName: string) {
    super();
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.friends = [];
    this.timeCreated = null;
  }

  public static wrap(data: IReadUser): User {
    const model = new User(data.attributes.email, data.attributes.firstName, data.attributes.lastName);
    model.id = data.id;
    model.friends = data.relationships.friends.data;
    model.timeCreated = new Date(data.attributes.timeCreated);
    return model;
  }

  public unwrap(): IWriteUser {
    return {
      id: this.id,
      type: this.type,
      attributes: {
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
      },
      relationships: {
        friends: {
          data: this.friends
        }
      }
    }
  }
}

Model.registry.put(User);
