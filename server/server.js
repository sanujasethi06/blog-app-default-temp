import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import User from "./Schema/User.js"
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken'
import cors from 'cors';
import admin from 'firebase-admin'
import serviceAccountKey from './react-blog-project-mern-firebase-adminsdk-3u7yv-f65f3ebb18.json' assert{type:"json"}
import {getAuth} from 'firebase-admin/auth'
import aws from 'aws-sdk'
import Blog from './Schema/Blog.js'


const server= express();
let PORT = 3000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
})

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password


server.use(express.json());
// server.use((req, res, next) => {
//     res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
//     next();
// });

server.use(cors());
mongoose.connect(process.env.DB_LOCATION,{
    autoIndex:true
});

const s3=new aws.S3({
    region:'eu-north-1',
    accessKeyId:process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    
})
const generateUploadURL=async ()=>{
    const date=new Date();
    const imageName=`${nanoid()}-${date.getTime()}.jpeg`;
   return await s3.getSignedUrlPromise('putObject',{
        Bucket:'blogging-mern-project',
        Key:imageName,
        Expires:1000,
        ContentType:"image/jpeg"
    })
}
const verifyJWT =(req,res,next)=>{
const authHeader =req.headers['authorization'];
const token= authHeader && authHeader.split(" ")[1];

if(token==null){
    return res.status(401).json({error: "No access token"})
}
jwt.verify(token,process.env.SECRET_ACCESS_KEY, (err,user)=>{
    if(err){
        return res.status(403).json({error:"Access token is invalid"})
    }
    req.user=user.id;
    next();
})
}

const formDatatoSend = (user)=>{

    const access_token = jwt.sign({id: user._id},process.env.SECRET_ACCESS_KEY)
    return{
        access_token,
        profile_img:user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    }
}
const generateUsername = async(email)=>{
    let username = email.split("@")[0];
    let isUsernameNotUnique = await User.exists({"personal_info.username":username}).then(result=> result)
    isUsernameNotUnique? username += nanoid().substring(0,5): "";

    return username;
}
mongoose.connection.on("error", err => {

  console.log("err", err)

})
mongoose.connection.on("connected", (err, res) => {

  console.log("mongoose is connected")

})


//upload image url route
server.get('/get-upload-url',(req,res)=>{
    generateUploadURL().then(url=>res.status(200).json({uploadURL:url})).catch(err=>{
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
})

server.post("/signup",(req,res)=>{
   let {fullname,email,password} = req.body;

   if(fullname.length<3){
    return res.status(403).json({"error":"fullname must be atleast 3 letteers long"})
   }
   if(!email.length){
    return res.status(403).json({"error":"Enter email"})
   }
   if(!emailRegex.test(email)){
    return res.status(403).json({"error":"Email is invalid"})
   }
   if(!passwordRegex.test(password)){
    return res.status(403).json({"error":"Password should be 6 to 20 characters long with a numeric 1 uppercase and 1 lowercase"})
   }
   //Password encryption -> return a hashed value
   bcrypt.hash(password,10,async(err,hashed_password)=>{

    let username = await generateUsername(email);
    let user = new User({
        personal_info:{fullname,email,password: hashed_password,username}
    })
    user.save().then((u)=>{
        return res.status(200).json(formDatatoSend(u))
    })
   .catch(err=>{
    if(err.code==11000){
        return res.status(500).json({"error":"Email is already exist"})
    }
    return res.status(500).json({"error":err.message})
   })
   })
  
})

server.post("/signin",(req,res)=>{

    let {email,password} = req.body;
    User.findOne({"personal_info.email":email})
    .then((user)=>{

        if(!user){
            return res.status(403).json({"error":"Email not found"});
        }
        bcrypt.compare(password,user.personal_info.password,(err,result)=>{
           if(err){
            return res.status(403).json({"error":"Error occured while lohin please try again"})
           } 
           if(!result){
            return res.status(403).json({"error":"Password is incorrect"})

           }else {
            return res.status(200).json(formDatatoSend(user))
           }
        })
        // console.log(user)
        // return res.json({"status":"got user document"})
    })
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({"error":err.message})
    })
})

server.post("/google-auth", async (req, res) => {
    try {
        const { access_token } = req.body;
        

        if (typeof access_token !== "string") {
            return res.status(400).json({ error: "Invalid access token" });
        }

        const decodedUser = await getAuth().verifyIdToken(access_token);

        let { email, name, picture } = decodedUser;
        picture = picture.replace("s96-c", "s384-c");

        let user = await User.findOne({ "personal_info.email": email })
                             .select("personal_info.fullname personal_info.username personal_info.profile_img google_auth");
                             console.log(user)

        if (user) {
            if (!user.google_auth) {
                return res.status(403).json({
                    "error": "This email was signed up without Google. Please log in with a password to access the account."
                });
            }
        } else {
            let username = await generateUsername(email);

            user = new User({
                personal_info: {
                    fullname: name,
                    email,
                    profile_img: picture,
                    username
                },
                google_auth: true
            });

            await user.save();
        }

        return res.status(200).json(formDatatoSend(user));
    } catch (err) {
        console.error("Error during Google authentication:", err);
        return res.status(500).json({
            "error": "Failed to authenticate you with Google. Try with some other account or check your network connection."
        });
    }
});

server.post('/latest-blogs', (req, res) => {
    let {page}=req.body
    const maxLimit = 5;
    Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id") // Remove space after hyphen
        .sort({ "publishedAt": -1 })
        .select("blog_id title desc banner activity tags publishedAt -_id") // Remove space after hyphen
        .skip((page-1)*maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});
server.post("/all-latest-blogs-count",(req,res)=>{
    Blog.countDocuments({draft:false})
    .then(count=>{
        return res.status(200).json({totalDocs:count})
    })
    .catch(err=>{
        return res.status(500).json({error: err.message})
    })
})
server.get("/trending-blogs",(req,res)=>{
    Blog.find({draft:false}).populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id").sort({ "activity.total_read":-1,"activity.total_likes":-1,"publishedAt":-1}).select("blog_id title publishedAt -_id").limit(5)
    .then(blogs=>{
        return res.status(200).json({blogs});

    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })
})
server.post("/search-blogs",(req,res)=>{
    let {tag ,query,author,page}=req.body;

    let findQuery;
    if(tag){
        findQuery={tags:tag,draft:false};
    }else if(query){
        findQuery={draft: false,title:new RegExp(query,'i')}
    }else if(author){
        findQuery={author,draft:false}
    }
    let maxLimit=5;
    Blog.find(findQuery)
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id") // Remove space after hyphen
    .sort({ "publishedAt": -1 })
    .select("blog_id title desc banner activity tags publishedAt -_id") // Remove space after hyphen
    .skip((page - 1)* maxLimit)
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({ blogs });
    })
    .catch(err => {
        return res.status(500).json({ error: err.message });
    });
});

server.post("/search-blogs-count",(req,res)=>{
    let {tag,author,query}=req.body;

    let findQuery;
    if(tag){
        findQuery={tags:tag,draft:false};
    }else if(query){
        findQuery={draft: false,title:new RegExp(query,'i')}
    }
    else if(author){
        findQuery={author,draft:false}
    }
    Blog.countDocuments(findQuery) 
    .then(count => {
        return res.status(200).json({ totalDocs: count });
    })
    .catch(err => {
        return res.status(500).json({ error: err.message });
    });
})

server.post("/search-users",(req,res)=>{
    let {query}=req.body;

    User.find({"personal_info.username":new RegExp(query,'i')})
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
    .then(user=>{
        return res.status(200).json({user})
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })
})

server.post("/get-profile",(req,res)=>{
    let { username } =req.body;
    User.findOne({"personal_info.username": username})
    .select("-personal_info.password -google_auth -updateAt -blogs")
    .then(user=>{
        return res.status(200).json(user)
    })
    .catch(err=>{
        console.log(err);
        return res.status(500).json({error:err.message})
    })
})

server.post('/create-blog',verifyJWT,(req,res)=>{
    let authorId= req.user;
    let {title, desc , banner, tags,content,draft} = req.body;

    if(!draft){
        if(!desc.length){
            return res.status(403).json({error:"You must provide blog description under 200 characters"});
    
        }
        if(!banner.length){
            return res.status(403).json({error:"You must provide banner to publish it"});
            
        }
        if(!content.blocks.length){
            return res.status(403).json({error: "There must be some blog content to publish it"})
        }
        if(!tags.length || tags.length >10){
            return res.status(403).json({error: "Provide tags in order to publish the blog, Maximum 10"})
        }
    }

    if(!title.length){
        return res.status(403).json({error:"You must provide a title to publish the blog"})
    }
   
    tags= tags.map(tag=> tag.toLowerCase());

    let blog_id = title.replace(/[^a-zA-Z0-9]/g,' ').replace(/\s+/g,"-").trim() + nanoid();

    let blog = new Blog({
        title,desc,banner,content,tags,author:authorId,blog_id,draft:Boolean(draft)
    })
    blog.save().then(blog=>{
        let incrementVal = draft? 0:1;
         User.findOneAndUpdate({_id:authorId},{$inc:{"account_info.total_posts":incrementVal},$push:{"blogs":blog._id}})
         .then(user=>{
            return res.status(200).json({id:blog.blog_id})
         })
         .catch(err=>{
            return res.status(500).json({error:"Failed to update total posts number"})
         })
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })

})

server.post("/get-blog",(req,res)=>{
    let {blog_id} = req.body;
    let incrementalVal=1
    Blog.findOneAndUpdate({blog_id},{$inc:{"activity.total_reads":incrementalVal}})
    .populate("author","personal_info.fullname personal_info.username personal_info.profile_img")
    .select("title desc content banner activity publishedAt blog_id tags")
    .then(blog=>{
        User.findOneAndUpdate({"personal_info.username": blog.author.personal_info.username},{$inc:{"account_info.total_reads":incrementalVal}})
     .catch(err=>{
        return res.status(500).json({error:err.message})
     })   
        return res.status(200).json({blog})
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })
})

server.listen(PORT,()=>{
   console.log( 'listening on port->',PORT)
});

