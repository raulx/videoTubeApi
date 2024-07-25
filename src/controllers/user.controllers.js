import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            `Something went wrong while generating referesh and access token with message:${error.message}`
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    try {
        const { username, password, email, fullName } = req.body;
        const avatarLocalPath = req.files?.avatar[0]?.path;

        let coverImageLocalPath;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        if (
            req.files &&
            Array.isArray(req.files.coverImage) &&
            req.files.coverImage.length > 0
        ) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        if (
            [username, password, email, fullName].some(
                (field) => field?.trim() === ""
            )
        ) {
            throw new ApiError(400, "All Fields are required");
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existedUser) {
            //remove the uploaded images because user already exits and there is not need to keep the avatar or cover image of the user.
            {
                avatarLocalPath && fs.unlinkSync(avatarLocalPath);
            }
            {
                coverImageLocalPath && fs.unlinkSync(coverImageLocalPath);
            }

            throw new ApiError(409, "User Already Exists");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!avatar) {
            throw new ApiError(400, "Avatar file is required");
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if (!createdUser) {
            throw new ApiError(
                500,
                "Something went wrong while registering the user"
            );
        }

        return res
            .status(201)
            .json(new ApiResponse(200, "User registered Successfully"));
    } catch (error) {
        new ApiError(500, error.message);
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordMatched(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully"
            )
        );
});

export { registerUser, loginUser };
