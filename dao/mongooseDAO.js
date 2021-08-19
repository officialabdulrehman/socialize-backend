import DBSort from "./sorting";
import mongoose from "mongoose";

const ID = mongoose.Types.ObjectId;

export class MongooseDAO {
  model;

  constructor(model) {
    this.model = model;
  }

  async create(record) {
    const obj = new this.model(record);
    const result = await obj.save();
    return result;
  }

  async find(
    condition,
    page = 1,
    perPage = 10,
    populate = [],
    sort = { createdAt: DBSort.DESCENDING }
  ) {
    if (page < 1) {
      const error = new Error("Page cannot be smaller than 1");
      error.data = [{ param: page }];
      error.code = 400;
      throw error;
    }
    if (perPage < 1) {
      const error = new Error("perPage cannot be smaller than 1");
      error.data = [{ param: page }];
      error.code = 400;
      throw error;
    }
    let skip = (page - 1) * perPage;
    skip = page > 1 ? skip - 1 : skip;
    const limit = page > 1 ? perPage + 2 : perPage + 1;
    let query = this.model.find(condition);
    for (const p of populate) {
      query = query.populate(p);
    }
    query = query.skip(skip).limit(limit).sort(sort);
    let data = await query;

    const objCount = data.length;
    const hasPrevious = page > 1 && objCount > 0;
    const lower = hasPrevious ? 1 : 0;

    const hasNext = objCount > perPage + lower;
    const upper = hasNext ? perPage + lower : objCount;

    data = data.slice(lower, upper);

    const result = {
      data,
      pagination: {
        hasNext,
        hasPrevious,
        perPage,
        page,
        next: "",
        previous: "",
      },
    };
    return result;
  }

  async findById(Id) {
    const id = ID(Id);
    const result = await this.model.findById(id);
    if (!result) {
      const error = new Error(`Record with id ${id} not found.`);
      error.data = [{ param: id }];
      error.code = 404;
      throw error;
    }
    return result;
  }

  async update(id, record) {
    const existing = await this.model.findById(id);

    Object.entries(record).map(([key, value]) => {
      existing[key] = value;
    });

    const result = await existing.save();

    return result;
  }

  async delete(id) {
    const result = await this.model.findByIdAndDelete(id);
    if (!result) {
      const error = new Error(`Record with id ${id} not found.`);
      error.data = [{ param: id }];
      error.code = 404;
      throw error;
    }
    return result;
  }

  async findByIdAndUpdate(id, record) {
    const result = await this.model.findByIdAndUpdate(id, record, {
      new: true,
    });
    return result;
  }
}
export default MongooseDAO;
