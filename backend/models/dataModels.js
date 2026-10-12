import mongoose,{Schema} from "mongoose";

const instituteSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  domains: {
    type: [String],
    required: true
  },
  web_pages: {
    type: [String],
    required: true
  },
  country: {
    type: String,
    required: true
  },
  alpha_two_code: {
    type: String,
    required: true,
    maxlength: 2
  },
  state_province: {
    type: String,
    default: null
  },
  "state-province": {
    type: String,
    default: null
  }
}, { strict: false });

const Institute = mongoose.model("universities", instituteSchema);

export default Institute;