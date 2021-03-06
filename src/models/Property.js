const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');
const mongodbErrorHandler = require('mongoose-mongodb-errors');

const propertySchema = new mongoose.Schema( {
  name: {
    type: String,
    trim: true,
    required: [true, 'Must supply a name!']
  },
  slug: String,
  description: {
    type: String,
    trim: true,
    required: 'Must supply a description!'
  },
  thumbnailImg: [String],
  mainImg: [String],
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    //Mongodb accepts lat, lng while google map supplies lng, lat
    coordinates: [{
      type: Number,
      required: 'Must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'Must supply an address!'
    }
  }
});

// Define indexes for fast result retrieval
propertySchema.index({
  name: 'text',
  description: 'text'
});

propertySchema.index({
  location: '2dsphere'
});

const generateUniqueSlugs = async function (next) {
  if(!this.isModified('name')) {
    next(); //skip if name has not been modified
    return;
  }
  this.slug = slug(this.name);
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, 'i');
  const propertyWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (propertyWithSlug.length) {
    this.slug = `${this.slug}-${propertyWithSlug.length + 1}`;
  }
  next();
};

propertySchema.pre('save', generateUniqueSlugs);

propertySchema.statics.getTagsList = function () {
  //https://docs.mongodb.com/manual/reference/operator/aggregation/
  // pipeline operators
  return this.aggregate([
    // tags are the field on my document I wish to unwind
    { $unwind: '$tags' },
    // group by tags and create a new property, count
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // sort data
    { $sort: { count: -1 } }
  ])
};

propertySchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('Property', propertySchema);