import { Body, Controller, Delete, Get, HttpStatus, Redirect, Param, Post, Headers, Put, Req, Res } from "@nestjs/common";
import { User, User2 } from "./schema/user.schema";
import { UserService } from "./user.service";
import { UserDto, metamaskDto } from "./dto/user.dto";
import { updateUserdto } from "./dto/user.dto";

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    helloGaze() {
        return 'Guarded and healthy.';
    }
    // @Redirect('', 301)
    // redirectToWebsite() {}


    @Post('user/signup')
    async Signup(@Res() response, @Body() user: User) {
        const newUSer = await this.userService.signup(user);
        return response.status(HttpStatus.CREATED).json({
            ...newUSer
        })
    }

    @Post('user/signupmeta')
    async SignupMeta(@Res() response, @Body() user: User2) {
        const newUSer = await this.userService.signupMetamask(user);
        return response.status(HttpStatus.CREATED).json({
            ...newUSer
        })
    }

    @Post('user/signin')
    async SignIn(@Res() response, @Body() user: UserDto) {
        const token = await this.userService.signin(user);
        return response.status(HttpStatus.OK).json(token)
    }

    @Get('user/verify')
    async verifyAuth(@Headers('authorization') authHeader: string,) {

        return this.userService.verifyAuth(authHeader)
    }

    @Post('user/updateuser')
    async updateuser(@Headers('authorization') authHeader: string, @Body() user: updateUserdto) {

        return this.userService.updateAndSubscribe(user, authHeader);
    }

    @Get('user/unsubscribe')
    async unsubscribe(@Headers('authorization') authHeader: string,) {

        return this.userService.UnsubscribeNFTNotifs(authHeader)
    }

    @Get('user/getnotifs')
    async getNFTNotifs(@Headers('authorization') authHeader: string) {

        return this.userService.getNFTNotification(authHeader);
    }


    @Post('user/proto')
    async proto(@Headers('authorization') authHeader: string) {

        return this.userService.proto(authHeader);
    }

    @Post('create_paymentsheet')
    async cps(@Body() paymentData: { email: string, fullName: string, amount: number }) {
        return await this.userService.createPaymentSheet(paymentData);
    }

}