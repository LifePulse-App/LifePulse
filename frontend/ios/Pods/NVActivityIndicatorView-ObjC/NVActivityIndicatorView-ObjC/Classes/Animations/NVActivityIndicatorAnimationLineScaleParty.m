#import "NVActivityIndicatorAnimationLineScaleParty.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationLineScaleParty

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat lineSize = size.width / 7;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    NSArray *durations = @[@(1.26/speedMultiplier), @(0.43/speedMultiplier), @(1.01/speedMultiplier), @(0.73/speedMultiplier)];
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0.77, @0.29, @0.28, @0.74];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionDefault];

    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0.5, @1];
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    for (int i = 0; i < 4; i++) {
        CALayer *line = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeLine size:CGSizeMake(lineSize, size.height) color:color];
        CGRect frame = CGRectMake(x + lineSize * 2 * i, y, lineSize, size.height);

        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        animation.duration = [durations[i] doubleValue];
        line.frame = frame;
        [line addAnimation:animation forKey:@"animation"];
        [layer addSublayer:line];
    }
}

@end
