import { Injectable, HttpException, HttpStatus, } from "@nestjs/common";
import { httpErrorException } from './user.exception';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./schema/user.schema";
import * as jwt from 'jsonwebtoken';
const bcrypt = require('bcrypt');
import { config } from 'dotenv';
import { UserDto } from "./dto/user.dto";
import { updateUserdto } from "./dto/user.dto";
const Web3 = require("web3").default;
const webpush = require('web-push');


config();

const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret: string = process.env.REFRESH_TOKEN_SECRET;
const infura: string = process.env.INFURA_ID;
let subscription721;
let subscription1155;
const publicKey: string = process.env.VAPIDPUBLICKEYS;
const privateKey: string = process.env.VAPIDPRIVATEKEYS;
const gcmapi: string = process.env.GCMAPI


@Injectable()
export class UserService {

    constructor(@InjectModel(User.name) private userModel: Model<User>) { }


    //METHODS
    private generateAccessToken(payload: any): string {
        return jwt.sign({ payload }, accessTokenSecret, {
            expiresIn: '90d',
        });
    }

    private generateRefreshToken(payload: any): string {
        return jwt.sign({ payload }, refreshTokenSecret,
            { expiresIn: "5m" },
        );
    }

    private validateToken(token: string, secret: string): string | object {
        if (token == undefined || token == "") throw new httpErrorException(`${token}, Undefined token, Unauthorized access.`, HttpStatus.NOT_ACCEPTABLE)
        const tokens = token.slice(7, token.length).toString();
        const decoded = jwt.verify(tokens, secret);

        return decoded;
    }


    private verifyToken(verifyHeader: string): string {
        const token = verifyHeader;

        const final = this.validateToken(token, accessTokenSecret) as any;
        const refreshToken = this.generateRefreshToken(final.payload);
        const userId = final.payload;
        return userId;

    }

    private async findOne(mail: string): Promise<User> {
        return this.userModel.findOne({ email: mail }).exec();
    }

    private async triggerPushNotifs(payload: string, subscription: any): Promise<any> {

        webpush.setGCMAPIKey(gcmapi);
        webpush.setVapidDetails(
            'mailto:bunmigrey@icloud.com',
            publicKey,
            privateKey,
        );

        const options = {
            TTL: 10000,
        };

        try {
            return await webpush.sendNotification(subscription, payload);
            //return (subscription);
        } catch (err) {
            throw err;
        }
    }


    private async subscribeNFTNotifs(id: string, Address: string): Promise<any> {
        const web3 = new Web3(`wss://mainnet.infura.io/ws/v3/${infura}`);

        const filter = { _id: id };

        let options721 = {
            topics: [web3.utils.sha3("Transfer(address,address,uint256)")],
        };

        let options1155 = {
            topics: [
                web3.utils.sha3("TransferSingle(address,address,address,uint256,uint256)"),
            ],
        };

        const ERC165Abi: any = [
            {
                inputs: [
                    {
                        internalType: "bytes4",
                        name: "interfaceId",
                        type: "bytes4",
                    },
                ],
                name: "supportsInterface",
                outputs: [
                    {
                        internalType: "bool",
                        name: "",
                        type: "bool",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        const ERC1155InterfaceId: string = "0xd9b67a26";
        const ERC721InterfaceId: string = "0x80ac58cd";

        const newContract = new web3.eth.Contract(
            ERC165Abi,
            Address
        );

        //verify if the contract adddress is erc721 or erc1155, returns a boolean;
        const erc1155 = await newContract.methods.supportsInterface(ERC1155InterfaceId).call()

        const erc721 = await newContract.methods.supportsInterface(ERC721InterfaceId).call();


        if (erc721) {

            try {
                subscription721 = await web3.eth.subscribe("logs", options721);

                const update = {
                    $set: {
                        NFTsubscriptionId: subscription1155.id,
                    }
                };

                subscription721.on("error", () => {
                    throw new httpErrorException('There is an error with your subscription, please retry', HttpStatus.BAD_GATEWAY);
                });

                subscription721.on("data", (event) => {
                    if (event.topics.length == 4) {
                        let transaction = web3.eth.abi.decodeLog(
                            [
                                {
                                    type: "address",
                                    name: "from",
                                    indexed: true,
                                },
                                {
                                    type: "address",
                                    name: "to",
                                    indexed: true,
                                },
                                {
                                    type: "uint256",
                                    name: "tokenId",
                                    indexed: true,
                                },
                            ],
                            event.data,
                            [event.topics[1], event.topics[2], event.topics[3]]
                        );

                        // if (transaction.from == "0x495f947276749ce646f68ac8c248420045cb7b5e") {
                        //     console.log("Specified address sent an NFT!");
                        // }
                        // if (transaction.to == "0x495f947276749ce646f68ac8c248420045cb7b5e") {
                        //     console.log("Specified address received an NFT!");
                        // }
                        if (
                            event.address == Address
                        ) {
                            console.log(`Event on contract address: ${Address}`);
                            // return this.triggerPushNotifs(payload, subscriptionId);
                        }

                        console.log(
                            `\n` +
                            `New ERC-712 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                            `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                                ? "New mint!"
                                : transaction.from
                            }\n` +
                            `To: ${transaction.to}\n` +
                            `Token contract: ${event.address}\n` +
                            `Token ID: ${transaction.tokenId}`
                        );
                    }
                });

                console.log("Subscription on ERC-721 started with ID %s", subscription721.id)
                return await (await this.userModel.findOneAndUpdate(filter, update, { new: true })).NFTsubscriptionId;

            } catch (error) {
                return error;
            }

        } else if (erc1155) {

            try {
                subscription1155 = await web3.eth.subscribe("logs", options1155);
                const update = {
                    $set: {
                        NFTsubscriptionId: subscription1155.id,
                    }
                };

                subscription1155.on("error", (err) => {
                    console.info(err)
                    throw new httpErrorException('There is an error with your subscription, please retry', HttpStatus.BAD_GATEWAY);
                });

                subscription1155.on("data", (event) => {
                    let transaction = web3.eth.abi.decodeLog(
                        [
                            {
                                type: "address",
                                name: "operator",
                                indexed: true,
                            },
                            {
                                type: "address",
                                name: "from",
                                indexed: true,
                            },
                            {
                                type: "address",
                                name: "to",
                                indexed: true,
                            },
                            {
                                type: "uint256",
                                name: "id",
                            },
                            {
                                type: "uint256",
                                name: "value",
                            },
                        ],
                        event.data,
                        [event.topics[1], event.topics[2], event.topics[3]]
                    );

                    if (
                        event.address == Address
                    ) {
                        //subscription logic comes here
                        console.log(`Event on contract address: ${Address}`);
                    }

                    //general subscription logic comes here
                    console.log(
                        `\n` +
                        `New ERC-1155 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                        `Operator: ${transaction.operator}\n` +
                        `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                            ? "New mint!"
                            : transaction.from
                        }\n` +
                        `To: ${transaction.to}\n` +
                        `id: ${transaction.id}\n` +
                        `value: ${transaction.value}`
                    );
                });

                console.log("Subscription on ERC-1155 started with ID %s", subscription1155.id)

                // (await this.userModel.findOneAndUpdate(filter, update, { new: true })).NFTsubscriptionId;
                return (subscription1155)

            } catch (error) {
                return error;
            }
        }

    }

    private async getNFTMetadata(tokenid: string, Address: string): Promise<any> {

        const tokenContract = Address;
        const tokenId = tokenid
    }

    private async unsubscribeFromNFTNotifs(tokenid: string): Promise<any> {

        const userProfile = await this.userModel.findById(tokenid).exec();

        if (userProfile.NFTsubscriptionId == undefined) {
            return ('no subscription to nft')
        }

        try {
            const result = await subscription1155.unsubscribe(userProfile.NFTsubscriptionId);
            return (`Successfully unsubscribed from the event: ${result}`);
        } catch (error) {
            return (`Error while unsubscribing from the event:, ${error}`);
        }
        // return (userProfile.NFTsubscriptionId);
    }






    //ROUTES

    async signup(user: User): Promise<{}> {
        const existingUser = await this.userModel.findOne({ email: user.email }).exec();

        if (existingUser) {
            throw new httpErrorException('User with this email already exists', HttpStatus.CONFLICT);
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);

        const newUser = await this.userModel.create({
            ...user,
            password: hashedPassword,
        });

        newUser.save();
        const id = newUser._id;

        const accessToken = this.generateAccessToken(newUser._id);
        const refreshToken = this.generateRefreshToken(newUser._id);

        return { id, accessToken, refreshToken }
    }



    async signin(user: UserDto): Promise<{ accessToken: string, refreshToken: string, id: string }> {
        const foundUser = await this.userModel.findOne({ email: user.email }).exec();


        if (!foundUser) {
            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        const isPasswordValid = await bcrypt.compare(user.password, foundUser.password);

        if (!isPasswordValid) {

            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        const accessToken = this.generateAccessToken(foundUser._id);
        const refreshToken = this.generateRefreshToken(foundUser._id);
        const id = foundUser._id.toString();


        return {
            accessToken,
            refreshToken,
            id,
        }

    };

    public async verifyAuth(verifyHeader: string): Promise<object> {
        const token = verifyHeader;

        const final = this.validateToken(token, accessTokenSecret) as any;

        try {
            // return this.generateRefreshToken(final.payload);
            const refreshToken = this.generateRefreshToken(final.payload);
            const userId = final.payload;
            const userProfile = await this.userModel.findById(userId).exec();
            const { contractAddress } = userProfile;

            if (!contractAddress) {
                return { refreshToken, userId, contractAddress: null };
            } else if (contractAddress) {
                return { refreshToken, userId, contractAddress };
            }

        } catch (error) {
            console.log(error.message);
        }

    };

    async findUserAndUpdate(user: updateUserdto, verifyHeader: string): Promise<any> {
        const userId = this.verifyToken(verifyHeader) as any;
        const { endpoint } = user.subscriptionId as any;

        const filter = { _id: userId };

        if (Web3.utils.isAddress(user.contractAddress)) {
            const update = {
                $set: {
                    contractAddress: user.contractAddress,
                    subscriptionId: user.subscriptionId,
                }
            };

            try {
                const userProfile = await this.userModel.findOneAndUpdate(filter, update, { new: true }) as any;
                if (endpoint == null || endpoint == "") {
                    throw new httpErrorException(`Something went wrong. Enable notification permission on your browser and retry`, HttpStatus.BAD_REQUEST);
                } else {
                    return (userProfile);
                }
                // return (endpoint);

            } catch (error) {
                return error;
            }
        }

        throw new httpErrorException('Wrong contract address or format, Please check again.', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // async UnsubscribeNFTNotifs(user: updateUserdto, verifyHeader: string): Promise<any> {
    //     const { userId } = this.verifyAuth(verifyHeader) as any;


    // }


    async testRoute(id: string): Promise<any> {
        const { userId } = this.verifyAuth(id) as any;
        let _id = userId;

        const userProfile = await this.userModel.findById(_id).exec();

        try {
            const { _id, contractAddress, subscriptionId } = userProfile;
            const payload = JSON.stringify({
                title: 'GAZE NFT Notification',
                body: 'Raskimono CLUB',
                icon: 'https://res.cloudinary.com/dis6jfj29/image/upload/v1691076029/gaze_logo_no_background_dgy9tr.png',
            });
            // return await this.subscribeNFTNotifs(_id.toString(), contractAddress);
            // return this.unsubscribeFromNFTNotifs(_id.toString());
            return await this.triggerPushNotifs(payload, subscriptionId);
        } catch (err) {
            throw (err);
        }
    }
}
