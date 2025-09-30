#import "NVActivityIndicatorAnimationBallGridBeat.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallGridBeat

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = 2.0;
    CGFloat circleSize = (size.width - circleSpacing * 2) / 3;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    NSArray *durations = @[@(0.96/speedMultiplier), @(0.93/speedMultiplier), @(1.19/speedMultiplier), @(1.13/speedMultiplier), @(1.34/speedMultiplier), @(0.94/speedMultiplier), @(1.2/speedMultiplier), @(0.82/speedMultiplier), @(1.19/speedMultiplier)];
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0.36, @0.4, @0.68, @0.41, @0.71, @-0.15, @-0.12, @0.01, @0.32];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionDefault];
    
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0.7, @1];
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(circleSize, circleSize) color:color];
            CGRect frame = CGRectMake(x + circleSize * j + circleSpacing * j,
                                    y + circleSize * i + circleSpacing * i,
                                    circleSize,
                                    circleSize);
            
            int index = 3 * i + j;
            animation.duration = [durations[index] doubleValue];
            animation.beginTime = beginTime + [beginTimes[index] doubleValue];
            circle.frame = frame;
            [circle addAnimation:animation forKey:@"animation"];
            [layer addSublayer:circle];
        }
    }
}

@end
