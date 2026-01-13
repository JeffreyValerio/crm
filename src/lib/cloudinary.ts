import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dcv0ebwbf',
  api_key: process.env.CLOUDINARY_API_KEY || '927517631119476',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Qe9kL9pE3YVHQcB8gZchWNOzkSc',
});

export default cloudinary;
